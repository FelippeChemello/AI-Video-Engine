import path from 'path';

import { outputDir, publicDir } from './config/path';
import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { ENV } from './config/env';
import { GrokClient } from './clients/grok';
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { generateIllustration } from './services/generate-illustration';
import { cleanupFiles } from './services/cleanup-files';
import { generateThumbnails } from './services/generate-thumbnails';

const CHANNELS = [Channels.CODESTACK]

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_DEFAULT_DATABASE_ID);
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const grok: LLMClient = new GrokClient();

const latestNewsScript = await scriptManagerClient.retrieveLatestScripts(10, Compositions.Portrait);

console.log(`Starting research about the latest news`);
const research = await grok.complete(Agent.NEWS_RESEARCHER, `Research relevant and recent news articles (from the past 12 hours) that would be interesting for our audience. We have already published these topics recently: ${latestNewsScript.map(s => s.title).join(', ')}. Prioritize news that are different from what we have already covered!`);

console.log("--------------------------")
console.log("Research:")
console.log(research.news)
console.log("--------------------------")

const scripts: ScriptWithTitle[] = await Promise.all(
    research.news.map(async (newsItem) => {
        console.log(`Writing script for "${newsItem.headline}"`);
        const scriptText = await openai.complete(Agent.NEWSLETTER_WRITER, `Crie um único script para um vídeo curto baseado na seguinte notícia: \n\n ${newsItem.headline}:\n ${newsItem.summary} \n\n A notícia é do site ${newsItem.source}.`)
        return scriptText.scripts as ScriptWithTitle[];
    })
).then(scriptsArrays => scriptsArrays
    .flat()
    .map(script => ({
        ...script,
        compositions: [Compositions.Portrait],
    }))
)

await Promise.all(
    scripts.map(async (script) => {
        const audio = await synthesizeSpeech(script.segments, script.compositions?.includes(Compositions.Portrait) ? MAX_AUDIO_DURATION_FOR_SHORTS : undefined);
        script.audio = [{ src: audio.audioFileName, duration: audio.duration }];
    })
);

for (const script of scripts) {
    console.log(`Processing script: ${script.title}`);

    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = await generateIllustration(segment).catch(err => {
                console.error(`Error generating illustration for segment "${segment.text.substring(0, 30)}...":`, err);
                return undefined;
            });

            segment.mediaSrc = mediaSrc;
        })
    )

    const thumbnails = script.compositions?.includes(Compositions.Landscape) 
        ? await generateThumbnails(script.title, script.compositions, CHANNELS) 
        : [];
        
    await scriptManagerClient.saveScript({
        script,
        scriptSrc: path.basename(scriptTextFile),
        formats: script.compositions,
        channels: CHANNELS,
        thumbnailsSrc: thumbnails,
    });

    cleanupFiles([
        scriptTextFile,
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>,
        ...thumbnails.map(t => path.join(outputDir, t)),
    ])
}