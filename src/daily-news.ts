import path from 'path';

import { outputDir, publicDir } from './config/path';
import { Channels, Compositions, ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { ENV } from './config/env';
import { GrokClient } from './clients/grok';
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { generateIllustration } from './services/generate-illustration';
import { cleanupFiles } from './services/cleanup-files';
import { GmailClient } from './clients/gmail';
import { NewsletterFetcher, NewsletterSource } from './clients/interfaces/NewsletterFetcher';
import { generateThumbnails } from './services/generate-thumbnails';

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_DEFAULT_DATABASE_ID);
const gmail: NewsletterFetcher = new GmailClient();
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const grok: LLMClient = new GrokClient();

const ENABLED_FORMATS: Array<Compositions> = [Compositions.Portrait];

console.log(`Starting research about the latest news`);
const research = await grok.complete(Agent.NEWS_RESEARCHER, `Research relevant and recent news articles (from the past 12 hours only) that would be interesting for our audience.`);

console.log("--------------------------")
console.log("Research:")
console.log(research.news)
console.log("--------------------------")

const newsletter = await gmail.fetchContent(NewsletterSource.FILIPE_DESCHAMPS)
    .catch(error => {
        console.error("Error fetching newsletter content:", error.message);
        
        return { title: "Newsletter content unavailable", content: "" };
    });

console.log("Writing script based on research...");
const scriptText = await openai.complete(Agent.NEWSLETTER_WRITER, `A seguir estão as notícias que devem ser reportadas no script do video de hoje: \n\n ${research.news} \n\n ${newsletter.content}`);

console.log("Reviewing script...");
const review = await anthropic.complete(Agent.NEWSLETTER_REVIEWER, scriptText.scripts)

const scripts: ScriptWithTitle[] = review.scripts as ScriptWithTitle[];

for (const script of scripts) {
    console.log(`Processing script: ${script.title}`);

    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    const audio = await synthesizeSpeech(script.segments, MAX_AUDIO_DURATION_FOR_SHORTS);
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = await generateIllustration(segment);
            segment.mediaSrc = mediaSrc;
        })
    );

    const thumbnails = await generateThumbnails(script.title, ENABLED_FORMATS)
        
    await scriptManagerClient.saveScript({
        script,
        scriptSrc: path.basename(scriptTextFile),
        formats: ENABLED_FORMATS,
        thumbnailsSrc: thumbnails,
        channels: [Channels.CODESTACK]
    });

    cleanupFiles([
        scriptTextFile,
        ...thumbnails.map(t => path.join(outputDir, t)),
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>
    ])
}