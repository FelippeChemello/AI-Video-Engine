import fs from 'fs';
import path from 'path';

import { publicDir } from './config/path';
import { ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { NewsletterFetcher, NewsletterSource } from './clients/interfaces/NewsletterFetcher';
import { GmailClient } from './clients/gmail';
import { ENV } from './config/env';
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { generateIllustration } from './services/generate-illustration';
import { cleanupFiles } from './services/cleanup-files';

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gmail: NewsletterFetcher = new GmailClient();

const ENABLED_FORMATS: Array<'Portrait' | 'Landscape'> = ['Portrait'];

const newsletterFile = process.argv[2]
const newsletter: { title: string; content: string } = newsletterFile 
    ? { title: path.basename(newsletterFile, path.extname(newsletterFile)), content: fs.readFileSync(newsletterFile, 'utf-8') }
    : await gmail.fetchContent(NewsletterSource.FILIPE_DESCHAMPS);

console.log("Writing script based on newsletter...");
const { text: scriptText } = await openai.complete(Agent.NEWSLETTER_WRITER, `${newsletter.title}\n\n${newsletter.content}`); 

console.log("Reviewing script...");
const { text: review } = await anthropic.complete(Agent.NEWSLETTER_REVIEWER, scriptText)

let scripts: ScriptWithTitle | ScriptWithTitle[] = []
try {
    scripts = JSON.parse(review)
} catch (error) {
    scripts = JSON.parse(scriptText)
}

for (const script of Array.isArray(scripts) ? scripts : [scripts]) {
    console.log(`Processing script: ${script.title}`);

    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    const audio = await synthesizeSpeech(script.segments, MAX_AUDIO_DURATION_FOR_SHORTS);
    script.audioSrc = audio.audioFileName;

    await Promise.all(
        script.segments.map(async (segment) => {
            const mediaSrc = await generateIllustration(segment);
            segment.mediaSrc = mediaSrc;
        })
    );

    await scriptManagerClient.saveScript(
        script, 
        { title: script.title, description: '', hashtags: [], tags: [] },
        [], 
        ENABLED_FORMATS, 
        path.basename(scriptTextFile)
    );

    cleanupFiles([
        scriptTextFile,
        path.join(publicDir, script.audioSrc!),
        ...script.segments
            .map(segment => segment.mediaSrc ? path.join(publicDir, segment.mediaSrc) : null)
            .filter(Boolean) as Array<string>
    ])
}