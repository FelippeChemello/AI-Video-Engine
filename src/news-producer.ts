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
import { ENV } from './config/env';
import { GrokClient } from './clients/grok';
import { saveScriptFile } from './services/save-script-file';
import { synthesizeSpeech } from './services/synthesize-speech';
import { MAX_AUDIO_DURATION_FOR_SHORTS } from './config/constants';
import { generateIllustration } from './services/generate-illustration';
import { cleanupFiles } from './services/cleanup-files';

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const grok: LLMClient = new GrokClient();

const ENABLED_FORMATS: Array<'Portrait' | 'Landscape'> = ['Portrait'];

const latestScripts = await scriptManagerClient.retrieveLatestScripts(10);

console.log(`Starting research about the latest news`);
const { text: research } = await grok.complete(Agent.NEWS_RESEARCHER, `We have already published these news articles:\n${latestScripts.map(s => `- ${s.title}`).join('\n')}\n\nNow, research other relevant and recent news articles (from the past 24 hours) that would be interesting for our audience.`);

console.log("--------------------------")
console.log("Research:")
console.log(research)
console.log("--------------------------")

console.log("Writing script based on research...");
const { text: scriptText } = await openai.complete(Agent.NEWSLETTER_WRITER, research); 

console.log("Reviewing script...");
const { text: review } = await anthropic.complete(Agent.NEWSLETTER_REVIEWER, scriptText)

let scripts: ScriptWithTitle | ScriptWithTitle[] = []
try {
    scripts = JSON.parse(review)
} catch (error) {
    console.log("Failed to parse reviewed script, falling back to original script.");

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