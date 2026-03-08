import path from 'path';

import { publicDir } from './config/path';
import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { GeminiClient } from "./clients/gemini";
import { TTSClient } from './clients/interfaces/TTS';
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { generateIllustration } from './services/generate-illustration';
import { generateThumbnails } from './services/generate-thumbnails';
import { cleanupFiles } from './services/cleanup-files';

const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gemini: LLMClient & ImageGeneratorClient & TTSClient = new GeminiClient();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const ENABLED_FORMATS: Array<Compositions> = [Compositions.Portrait];

const topic = process.argv[2]
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

console.log(`Starting research on topic: ${topic}`);
const research = await gemini.complete(Agent.RESEARCHER, `Tópico: ${topic}`);

console.log("--------------------------")
console.log("Research:")
console.log(research)
console.log("--------------------------")

console.log("Writing script based on research...");
const scriptText = await openai.complete(Agent.SCRIPT_WRITER, `Tópico: ${topic}\n\n Utilize o seguinte contexto para escrever um roteiro de vídeo:\n\n${research.research}`);

console.log("Reviewing script...");
const review = await anthropic.complete(Agent.SCRIPT_REVIEWER, scriptText.scripts)
const scripts = review.scripts as ScriptWithTitle | ScriptWithTitle[];

for (const script of Array.isArray(scripts) ? scripts : [scripts]) {
    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = await generateIllustration(segment);
            segment.mediaSrc = mediaSrc;
        })
    );

    const thumbnails = await generateThumbnails(script.title, ENABLED_FORMATS);    

    const audio = await synthesizeSpeech(script.segments);
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    await scriptManagerClient.saveScript({
        script,
        thumbnailsSrc: thumbnails,
        formats: ENABLED_FORMATS,
        channels: [Channels.CODESTACK]
    })

    cleanupFiles([
        scriptTextFile,
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>
    ])
}