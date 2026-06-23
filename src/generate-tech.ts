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
import { GPURunnerClient } from './clients/interfaces/GPURunner';
import { Modal } from './clients/modal';
import { TTSClient } from './clients/interfaces/TTS';
import { GeminiClient } from './clients/gemini';

const CHANNELS = [Channels.CODESTACK, Channels.FELIPPE_DEV]

const scriptManagerClient: ScriptManagerClient = new NotionClient();
const gemini: TTSClient = new GeminiClient()
const modal: GPURunnerClient = new Modal();

const topic = process.argv[2]
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

const baseScript: ScriptWithTitle = await generateLLMResponse({
    agent: Agent.TECH_WRITER, 
    prompt: `Tópico: ${topic}\n\n O roteiro deve ter duração de aproximadamente 1 minuto!!!`
});

const script: ScriptWithTitle = {
    ...baseScript,
    compositions: [Compositions.TechPortraitVideo]
}

const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

await Promise.all(
    script.segments.map(async (segment) => {
        const mediaSrc = segment.illustration && await generateIllustration({ description: segment.illustration.description, type: segment.illustration.type, context: segment.text })
        segment.mediaSrc = mediaSrc;
    })
);

const thumbnails = await generateThumbnails({
    videoTitle: topic,
    compositions: script.compositions!, 
    channels: CHANNELS
})

const audio = await synthesizeSpeech(
    script.segments,
    { 
        maxDurationInSeconds: MAX_AUDIO_DURATION_FOR_SHORTS,
        engines: [gemini]
    }
);
script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

const firstFrame = await generateIllustration({
    type: 'image_generation',
    description: `Using the reference image as the only identity reference, create a portrait-oriented first-frame image for a short video about "${topic}". \n\nFelippe must appear as the same character from the reference image, preserving his face, age, hairstyle, colors, proportions, blue headset, outfit style, and overall Studio Ghibli mixed with Pixar 3D animation look. \n\nThe composition should feel like Felippe is taking a selfie with his smartphone: close, dynamic, slightly wide-angle, with one arm naturally extended toward the viewer as if holding the phone just outside the frame. His body should be visible from the waist up, and he should be looking directly into the camera with a confident, enthusiastic, engaging expression, as if he is about to start explaining the topic. \n\nThe image should visually suggest the theme of "${topic}" through subtle background elements, props, lighting, or abstract visual metaphors related to the topic, without making the scene cluttered. The background must remain simple, clean, and not distract from Felippe. \n\nUse warm, clear, flattering lighting on his face. Keep the image polished, expressive, and highly detailed, with a modern educational tech creator feeling. \n\nDo not include any text, captions, logos, watermarks, signatures, UI elements, or any other person. Do not change Felippe’s identity. Do not distort the face, hands, fingers, headset, or body anatomy.`,
    imageSrc: path.join(publicDir, 'assets', 'felippe-ref.png'),
});

if (!firstFrame) throw new Error('Failed to generate video first frame')

const { videoSrc: videoFileName } = await modal.generateAvatar(
    path.resolve(publicDir, firstFrame),
    path.resolve(publicDir, audio.audioFileName)
);

await scriptManagerClient.saveScript({
    script,
    thumbnailsSrc: thumbnails,
    formats: script.compositions!,
    channels: CHANNELS,
    scriptSrc: path.basename(scriptTextFile),
    avatarVideoSrc: videoFileName
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