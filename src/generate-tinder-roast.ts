import fs from 'fs'

import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { Agent, ModelProvider } from "./clients/interfaces/LLM";
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { Speaker } from './clients/interfaces/TTS';
import path from 'path';
import { outputDir, publicDir } from './config/path';
import { cleanupFiles } from './services/cleanup-files';
import { generateLLMResponse } from './services/generate-llm-response';
import { generateIllustration } from './services/generate-illustration';
import { generateThumbnails } from './services/generate-thumbnails';
import { synthesizeSpeech } from './services/synthesize-speech';

const CHANNELS = [Channels.RED_FLAG_RADAR]
const ENABLED_FORMATS: Array<Compositions> = [Compositions.TinderRoast];

const scriptManagerClient: ScriptManagerClient = new NotionClient();

const archetype = process.argv[2];
if (!archetype) {
    console.error("Please provide the archetype as argument.");
    process.exit(1);
}

console.log(`\n\nStarting generation for archetype: ${archetype}`);

const roastScript = await generateLLMResponse({
    agent: Agent.TINDER_ROAST, 
    prompt: `Generate a funny Tinder roast for the archetype: ${archetype}. Keep it funny and witty.`,
    providers: [ModelProvider.GROK],
})

console.log(JSON.stringify(roastScript, null, 2));

const mainImage = await generateIllustration({ description: roastScript.profile.main_photo_description, type: 'image_generation' });
if (!mainImage) {
    throw new Error("Failed to generate main image for the profile.");
}

const profileImages = await Promise.all(roastScript.profile.photos
    .map(async (description) => await generateIllustration({ 
        description, 
        type: 'image_generation', 
        imageSrc: path.join(publicDir, mainImage) 
    }))
);

const thumbnail = await generateThumbnails({
    videoTitle: archetype, 
    compositions: ENABLED_FORMATS, 
    channels: CHANNELS,
    textLanguage: 'ENGLISH',
    customImage: {
        prompt:  `A thumbnail image for a funny Tinder roast video about the archetype: ${archetype}. Make it colorful and eye-catching. Use the attached image as a base for the person being roasted.`,
        src: path.join(publicDir, mainImage)
    }
}).catch((error) => {
    console.error(`Error generating thumbnail: ${error.error.message} - using main image as thumbnail instead.`);

    const filename = `Thumbnail-Portrait.png`;
    const thumbnailPath = path.join(outputDir, filename);
    fs.copyFileSync(path.join(publicDir, mainImage), thumbnailPath);

    return [filename];
});

const script: ScriptWithTitle = {
    title: archetype,
    compositions: [Compositions.TinderRoast],
    segments: [
        { speaker: Speaker.Roaster, text: roastScript.script.video_intro },
        { speaker: Speaker.Roaster, text: roastScript.script.intro },
        ...roastScript.script.photo_roasts.map((roast, index) => ({
            speaker: Speaker.Roaster,
            text: roast,
            illustration: {
                type: 'image_generation',
                description: roastScript.profile.photos[index],
            },
            mediaSrc: profileImages[index],
        })).filter(segment => segment.mediaSrc),
        ...roastScript.script.bio_roast.map(roast => ({
            speaker: Speaker.Roaster,
            text: roast.narration,
        })),
        { speaker: Speaker.Roaster, text: roastScript.script.decision.verdict },
    ],
};

const audio = await synthesizeSpeech(script.segments);
script.audio = [{ src: audio.audioFileName, duration: audio.duration }]

const settings = {
    bio_roast: roastScript.script.bio_roast.map(roast => ({ narration: roast.narration, highlight: roast.target })),
    swipe: roastScript.script.decision.swipe_direction,
    profile: { name: roastScript.profile.name, age: roastScript.profile.age, job: roastScript.profile.job, location: roastScript.profile.location }
}

await scriptManagerClient.saveScript({
    script,
    settings,
    thumbnailsSrc: thumbnail,
    formats: ENABLED_FORMATS,
    channels: CHANNELS,
})

cleanupFiles([
    ...script.audio!.map(a => path.join(publicDir, a.src)),
    ...script.segments
        .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
        .filter(Boolean) as Array<string>
])