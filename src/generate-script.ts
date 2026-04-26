import path from 'path';

import { publicDir } from './config/path';
import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { titleToFileName } from './utils/title-to-filename';
import { Agent } from "./clients/interfaces/LLM";
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { generateIllustration } from './services/generate-illustration';
import { generateThumbnails } from './services/generate-thumbnails';
import { cleanupFiles } from './services/cleanup-files';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { generateLLMResponse } from './services/generate-llm-response';

const CHANNELS = [Channels.CODESTACK]

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
const research = await generateLLMResponse({ agent: Agent.RESEARCHER, prompt: `Tópico: ${topic}` });

console.log("--------------------------")
console.log("Research:")
console.log(research.research)
console.log("--------------------------")

const scripts: Array<ScriptWithTitle> = await Promise.all(ENABLED_FORMATS.map(async composition => {
    console.log(`Writing ${composition} script based on research...`);
    const scriptText = await generateLLMResponse({
        agent: Agent.SCRIPT_WRITER, 
        prompt: `Tópico: ${topic}\n\n Utilize o seguinte contexto para escrever um roteiro de vídeo:\n\n${research.research}. \n\nO roteiro deve ter duração de aproximadamente ${compositionVideoLengthMap[composition]}!!!`
    });

    return scriptText.scripts.map(script => ({
        ...script,
        compositions: [composition]
    })) as Array<ScriptWithTitle>;
})).then(scripts => scripts.flat());

for (const script of scripts) {
    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = segment.illustration && await generateIllustration({ description: segment.illustration.description, type: segment.illustration.type, context: segment.text })
            segment.mediaSrc = mediaSrc;
        })
    );

    const thumbnails = await generateThumbnails({
        videoTitle: script.title, 
        compositions: script.compositions!,
        channels: CHANNELS
    });

    const audio = await synthesizeSpeech(script.segments, script.compositions?.includes(Compositions.Portrait) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined);
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