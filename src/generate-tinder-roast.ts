import fs from 'fs'

import { Channels, Compositions, Orientation, ScriptWithTitle, TinderRoastScript } from './config/types';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { GrokClient } from './clients/grok';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { Speaker } from './clients/interfaces/TTS';
import path from 'path';
import { outputDir, publicDir } from './config/path';
import { GeminiClient } from './clients/gemini';
import { cleanupFiles } from './services/cleanup-files';

const grok: LLMClient = new GrokClient();
const openai: ImageGeneratorClient = new OpenAIClient();
const gemini = new GeminiClient();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const archetype = process.argv[2];
if (!archetype) {
    console.error("Please provide the archetype as argument.");
    process.exit(1);
}

console.log(`\n\nStarting generation for archetype: ${archetype}`);

const { text: roastScripted } = await grok.complete(Agent.TINDER_ROAST, `Generate a funny Tinder roast for the archetype: ${archetype}. Keep it funny and witty.`);
const roastScript: TinderRoastScript = JSON.parse(roastScripted);

console.log(JSON.stringify(roastScript, null, 2));

const mainImage = await openai.generate({ prompt: roastScript.profile.main_photo_description })
const profileImages = await Promise.all(
    roastScript.profile.photos.map(async (description) => openai.generate({ 
        prompt: description, 
        baseImageSrc: path.join(publicDir, mainImage.mediaSrc!) 
    }).catch((error) => {
        console.error(`Error generating image for description: ${description} with error: ${error.error.message}`);
        return null;
    }))
);
const thumbnail = await openai.generateThumbnail({
    videoTitle: archetype,
    orientation: Orientation.PORTRAIT,
    thumbnailTextLanguage: 'ENGLISH',
    customImage: {
        prompt:  `A thumbnail image for a funny Tinder roast video about the archetype: ${archetype}. Make it colorful and eye-catching. Use the attached image as a base for the person being roasted.`,
        src: path.join(publicDir, mainImage.mediaSrc!)
    }
}).catch((error) => {
    console.error(`Error generating thumbnail: ${error.error.message} - using main image as thumbnail instead.`);

    const filename = `Thumbnail-Portrait.png`;
    const thumbnailPath = path.join(outputDir, filename);
    fs.copyFileSync(path.join(publicDir, mainImage.mediaSrc!), thumbnailPath);
    return { mediaSrc: filename };
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
            mediaSrc: profileImages[index]?.mediaSrc,
        })).filter(segment => segment.mediaSrc),
        ...roastScript.script.bio_roast.map(roast => ({
            speaker: Speaker.Roaster,
            text: roast.narration,
        })),
        { speaker: Speaker.Roaster, text: roastScript.script.decision.verdict },
    ],
};

const audio = await gemini.synthesize(
    Speaker.Roaster, 
    script.segments.map(segment => segment.text).join('\n'), 
    undefined,
    `Read the following Tinder roast script in American English with a mid-range vocal register and slight vocal fry. The tone should be cynical and unimpressed but witty and playful, as if texting a best friend. Use a fast-paced and snappy delivery with strategic pauses before punchlines, emphasizing key words for comedic impact. Ensure the voice sounds natural and conversational, avoiding any announcer-like or performed style.` 
);
script.audio = [{ src: audio.audioFileName, duration: audio.duration }]

const settings = {
    bio_roast: roastScript.script.bio_roast.map(roast => ({ narration: roast.narration, highlight: roast.target })),
    swipe: roastScript.script.decision.swipe_direction,
    profile: { name: roastScript.profile.name, age: roastScript.profile.age, job: roastScript.profile.job, location: roastScript.profile.location }
}

await scriptManagerClient.saveScript({
    script,
    formats: [Compositions.TinderRoast],
    settings,
    thumbnailsSrc: [thumbnail.mediaSrc!],
    channels: [Channels.RED_FLAG_RADAR]
})

cleanupFiles([
    ...script.audio!.map(a => path.join(publicDir, a.src)),
    ...script.segments
        .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
        .filter(Boolean) as Array<string>
])