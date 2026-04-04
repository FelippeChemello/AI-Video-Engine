import path from 'path';

import { outputDir, publicDir } from './config/path';
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
import { FishAudioTTSClient } from './clients/fishaudio';
import { TTSClient } from './clients/interfaces/TTS';
import { OpenAIClient } from './clients/openai';
import { GeminiClient } from './clients/gemini';

const CHANNELS = [Channels.ALMA_DE_TERREIRO]

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

const scripts: Array<ScriptWithTitle> = await Promise.all(ENABLED_FORMATS.map(async composition => {
    console.log(`Writing ${composition} script based on research...`);
    const fullScript = await openai.complete(Agent.RELIGIOUS_UMBANDA_WRITER, `Tópico: ${topic}\n\n Utilize o documento em anexo como contexto para escrever um roteiro de vídeo:\n\n. O roteiro deve ter duração de aproximadamente ${compositionVideoLengthMap[composition]}!!!`, [groundingFilePath]);

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

    const thumbnails = script.compositions?.includes(Compositions.ReligiousLandscape)
        ? await generateThumbnails(topic, script.compositions!, CHANNELS)
        : undefined;

    const audio = await synthesizeSpeech(
        script.segments, 
        script.compositions?.includes(Compositions.ReligiousPortrait) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined,
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
        ...(thumbnails || []).map(t => path.join(outputDir, t)),
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>,
    ])
}