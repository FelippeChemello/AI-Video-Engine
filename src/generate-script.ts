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
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';

const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gemini: LLMClient & ImageGeneratorClient & TTSClient = new GeminiClient();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const ENABLED_FORMATS: Array<Compositions> = [Compositions.Portrait, Compositions.Landscape];
const compositionVideoLengthMap: Partial<Record<Compositions, string>> = {
    [Compositions.Portrait]: '2 minutos e não mais que 3 minutos',
    [Compositions.Landscape]: '8 minutos'
};

const topic = process.argv[2]
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

console.log(`Starting research on topic: ${topic}`);
const research = await gemini.complete(Agent.RESEARCHER, `Tópico: ${topic}`);

console.log("--------------------------")
console.log("Research:")
console.log(research.research)
console.log("--------------------------")

const scripts: Array<ScriptWithTitle> = await Promise.all(ENABLED_FORMATS.map(async composition => {
    console.log(`Writing ${composition} script based on research...`);
    const scriptText = await openai.complete(Agent.SCRIPT_WRITER, `Tópico: ${topic}\n\n Utilize o seguinte contexto para escrever um roteiro de vídeo:\n\n${research.research}. O roteiro deve ter duração de aproximadamente ${compositionVideoLengthMap[composition]}!!!`);

    const review = await anthropic.complete(Agent.SCRIPT_REVIEWER, `Roteiro inicial: ${JSON.stringify(scriptText.scripts)}\n\n Revise o roteiro acima e sugira melhorias para torná-lo mais envolvente e adequado para um vídeo de ${compositionVideoLengthMap[composition]}. Considere aspectos como clareza, estrutura, engajamento e adequação ao público-alvo. Forneça uma versão revisada do roteiro com as melhorias implementadas.`);

    return review.scripts.map(script => ({
        ...script,
        compositions: [composition]
    })) as Array<ScriptWithTitle>;
})).then(scripts => scripts.flat());

for (const script of scripts) {
    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = await generateIllustration(segment);
            segment.mediaSrc = mediaSrc;
        })
    );

    const thumbnails = await generateThumbnails(script.title, script.compositions!);    

    const audio = await synthesizeSpeech(script.segments, script.compositions?.includes(Compositions.Portrait) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined);
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    await scriptManagerClient.saveScript({
        script,
        thumbnailsSrc: thumbnails,
        formats: script.compositions!,
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