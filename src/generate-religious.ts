import path from 'path';

import { publicDir } from './config/path';
import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { generateIllustration } from './services/generate-illustration';
import { generateThumbnails } from './services/generate-thumbnails';
import { cleanupFiles } from './services/cleanup-files';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { GrokClient } from './clients/grok';
import { FishAudioTTSClient } from './clients/fishaudio';
import { TTSClient } from './clients/interfaces/TTS';
import { OpenAIClient } from './clients/openai';
import { GeminiClient } from './clients/gemini';

const CHANNELS = [Channels.ALMA_DE_TERREIRO]

const grok: LLMClient = new GrokClient();
const openai: TTSClient & LLMClient = new OpenAIClient();
const gemini: TTSClient = new GeminiClient();
const fishaudio: TTSClient = new FishAudioTTSClient();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const ENABLED_FORMATS: Array<Compositions> = [Compositions.ReligiousPortrait, Compositions.ReligiousLandscape];
const compositionVideoLengthMap: Partial<Record<Compositions, string>> = {
    [Compositions.ReligiousPortrait]: '2 minutos e não mais que 3 minutos',
    [Compositions.ReligiousLandscape]: '8 minutos'
};

const topic = process.argv[2]
const groundingFilePath = process.argv[3]; // Optional grounding file path
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

console.log(`Starting research for topic: ${topic} with grounding file: ${groundingFilePath || 'None'}`);
const research = await grok.complete(Agent.RELIGIOUS_UMBANDA_RESEARCHER, `Tópico: ${topic}`);

console.log("--------------------------")
console.log("Research:")
console.log(research.research)
console.log("--------------------------")

const scripts: Array<ScriptWithTitle> = await Promise.all(ENABLED_FORMATS.map(async composition => {
    console.log(`Writing ${composition} script based on research...`);
    const fullScript = await openai.complete(Agent.RELIGIOUS_UMBANDA_WRITER, `Tópico: ${topic}\n\n Utilize o seguinte contexto para escrever um roteiro de vídeo:\n\n${research.research}. O roteiro deve ter duração de aproximadamente ${compositionVideoLengthMap[composition]}!!!`);

    return fullScript.scripts.map(script => ({
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

    const thumbnails = await generateThumbnails(script.title, script.compositions!, CHANNELS);    

    const audio = await synthesizeSpeech(
        script.segments, 
        script.compositions?.includes(Compositions.Portrait) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined,
        [fishaudio, gemini, openai]
    );
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    await scriptManagerClient.saveScript({
        script,
        thumbnailsSrc: thumbnails,
        formats: script.compositions!,
        channels: CHANNELS,
        scriptSrc: path.basename(scriptTextFile)
    })

    cleanupFiles([
        scriptTextFile,
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>
    ])
}