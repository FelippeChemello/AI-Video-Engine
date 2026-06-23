import path from 'path';

import { outputDir, publicDir } from './config/path';
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
import { Modal } from './clients/modal';
import { GPURunnerClient } from './clients/interfaces/GPURunner';

const scriptManagerClient: ScriptManagerClient = new NotionClient();
const modal: GPURunnerClient = new Modal();

const CHANCES_OF_VIDEO = 0.25;
const generateVideo = Math.random() < CHANCES_OF_VIDEO;

const ENABLED_FORMATS: Array<Compositions> = [
    Compositions.ReligiousLandscape,
    ...(generateVideo ? [Compositions.ReligiousPortraitVideo] : [Compositions.ReligiousPortrait]),
];
const compositionVideoLengthMap: Partial<Record<Compositions, string>> = {
    [Compositions.ReligiousPortraitVideo]: '30/45 segundos',
    [Compositions.ReligiousPortrait]: '2 minutos',
    [Compositions.ReligiousLandscape]: '5 minutos'
};

const date = new Date();
const topic = process.argv[2]
const groundingFilePath = process.argv[3]; // Optional grounding file path
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

const scripts: Array<ScriptWithTitle> = await Promise.all(ENABLED_FORMATS.map(async composition => {
    console.log(`Writing ${composition} script ${groundingFilePath ? `with grounding file ${groundingFilePath}` : 'without grounding file'}...`);
    const fullScript = await generateLLMResponse({
        agent: Agent.RELIGIOUS_UMBANDA_WRITER, 
        prompt: `Tópico/Pergunta: ${topic} ${groundingFilePath && "\n\n Utilize o documento em anexo como contexto para escrever um roteiro de vídeo, porém nunca referencie o mesmo, seu roteiro deve ser autoral sem referências a documentos externos!\n\n."} O roteiro deve ter duração de aproximadamente ${compositionVideoLengthMap[composition]}!!!`,
        filesSrc: groundingFilePath ? [groundingFilePath] : undefined,
    });

    const channels = [Channels.ALMA_DE_TERREIRO]
    if (composition === Compositions.ReligiousPortraitVideo) {
        channels.push(Channels.ALMA_DE_TERREIRO_UMBANDA);
    }

    return {
        title: fullScript.title,
        segments: fullScript.segments,
        compositions: [composition],
        channels,
    } satisfies ScriptWithTitle;
})).then(scripts => scripts.flat());

for (const script of scripts) {
    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    if (!script.compositions?.includes(Compositions.ReligiousPortraitVideo)) {
        await Promise.all(
            script.segments.map(async (segment) => {
                const mediaSrc = segment.illustration && await generateIllustration({ 
                    description: segment.illustration.description, 
                    type: segment.illustration.type,
                    context: segment.text
                });
                segment.mediaSrc = mediaSrc;
            })
        );
    }

    const thumbnails = await generateThumbnails({
        videoTitle: topic,
        compositions: script.compositions!, 
        channels: script.channels!,
    })

    const audio = await synthesizeSpeech(
        script.segments,
        { maxDurationInSeconds: script.compositions?.includes(Compositions.ReligiousPortraitVideo) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined }
    );
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    let videoFileName: string | undefined = undefined;
    let firstFrame: string | undefined = undefined;
    if (script.compositions?.includes(Compositions.ReligiousPortraitVideo)) {
        firstFrame = await generateIllustration({
            type: 'image_generation',
            description: `Using the reference image, create a portrait-oriented image that plays with the theme of the video, changing the clothes and the accessories of the person in the reference image to match the theme of the video that is umbanda related "${topic}". The image should be visually striking and relevant to the video's topic. The image must not include any text, logos, watermarks, signatures or any other person than the one in the reference image. It should be in the same style as the reference image, but with a different composition and elements that evoke the theme of the video. The background should be simple and not distract from the main subject and the body should be visible from the waist up. The person in the image should be looking directly at the camera with a confident and engaging expression.`,
            imageSrc: path.join(publicDir, 'assets', 'umbandista-ref-merged.png'),
        });

        if (!firstFrame) {
            console.error('Failed to generate the first frame for the video. Skipping video generation.');
            continue;
        }

        const avatarVideo = await modal.generateAvatar(
            path.resolve(publicDir, firstFrame),
            path.resolve(publicDir, audio.audioFileName)
        );

        videoFileName = avatarVideo.videoSrc;
    }


    await scriptManagerClient.saveScript({
        script,
        thumbnailsSrc: thumbnails,
        formats: script.compositions!,
        channels: script.channels!,
        scriptSrc: path.basename(scriptTextFile),
        avatarVideoSrc: videoFileName,
        date
    })

    cleanupFiles([
        scriptTextFile,
        videoFileName ? path.join(outputDir, videoFileName) : null,
        firstFrame ? path.join(publicDir, firstFrame) : null,
        ...(thumbnails || []).map(t => path.join(outputDir, t)),
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>,
    ].filter(Boolean) as Array<string>);
}