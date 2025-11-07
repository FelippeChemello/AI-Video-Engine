/* eslint-disable no-case-declarations */
import fs from 'fs';
import path from 'path';

import { outputDir, publicDir } from './config/path';
import { ScriptWithTitle } from './config/types';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { titleToFileName } from './utils/title-to-filename';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { GeminiClient } from "./clients/gemini";
import { Mermaid } from './clients/mermaid';
import { MermaidRendererClient } from './clients/interfaces/MermaidRenderer';
import { SearcherClient } from './clients/interfaces/Searcher';
import { Google } from './clients/google';
import { CodeRendererClient } from './clients/interfaces/CodeRenderer';
import { Shiki } from './clients/shiki';
import { NewsletterFetcher, NewsletterSource } from './clients/interfaces/NewsletterFetcher';
import { GmailClient } from './clients/gmail';
import { TTSClient } from './clients/interfaces/TTS';
import { ENV } from './config/env';
import { AudioEditorClient } from './clients/interfaces/AudioEditor';
import { FFmpegClient } from './clients/ffmpeg';

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const editor: AudioEditorClient = new FFmpegClient();
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gemini: LLMClient & ImageGeneratorClient & TTSClient = new GeminiClient();
const mermaid: MermaidRendererClient = new Mermaid();
const shiki: CodeRendererClient = new Shiki();
const google: SearcherClient = new Google();
const gmail: NewsletterFetcher = new GmailClient();

const ENABLED_FORMATS: Array<'Portrait' | 'Landscape'> = ['Portrait'];
const MAX_AUDIO_DURATION_FOR_SHORTS = 170; // seconds

console.log("Fetching newsletter content...");
const newsletter = await gmail.fetchContent(NewsletterSource.FILIPE_DESCHAMPS);

console.log(`Starting research about the news`);
const { text: research } = await gemini.complete(Agent.NEWS_REFINER, `Título: ${newsletter.title}\n\n Utilize o seguinte conteúdo do newsletter para realizar uma pesquisa aprofundada sobre o tópico:\n\n${newsletter.content}`);

console.log("--------------------------")
console.log("Research:")
console.log(research)
console.log("--------------------------")

console.log("Writing script based on research...");
const { text: scriptText } = await openai.complete(Agent.NEWSLETTER_WRITER, research); 

console.log("Reviewing script...");
const { text: review } = await anthropic.complete(Agent.NEWSLETTER_REVIEWER, scriptText)
const script = JSON.parse(review) as ScriptWithTitle

const scriptTextFile = path.join(outputDir, `${titleToFileName(script.title)}.txt`);
fs.writeFileSync(scriptTextFile, `
Read aloud this conversation between Felippe and his dog Cody. Cody has a curious and playful personality with an animated character like voice, while Felippe is knowledgeable and enthusiastic.
Felippe is known for his vast knowledge, and Cody is a curious dog who is always asking questions about the world, both are Brazilian Portuguese speakers and have a super very fast-paced, energetic, and enthusiastic way of speaking.

${script.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')}`, 'utf-8');

const audioFile = await gemini.synthesizeScript(script.segments, 'full-script');

if (audioFile.duration && audioFile.duration > MAX_AUDIO_DURATION_FOR_SHORTS) {
    console.log(`Audio duration ${audioFile.duration}s exceeds maximum for shorts. Speeding up audio...`);

    const speedFactor = audioFile.duration / MAX_AUDIO_DURATION_FOR_SHORTS;
    const audioPath = path.join(publicDir, audioFile.audioFileName);

    const speededUpAudioPath = await editor.speedUpAudio(audioPath, speedFactor);
    audioFile.audioFileName = path.basename(speededUpAudioPath);
}

script.audioSrc = audioFile.audioFileName;

for (const [index, segment] of script.segments.entries()) {
    if (segment.illustration) {
        let mediaSrc: string | undefined;

        switch (segment.illustration.type) {
            case 'mermaid': 
                console.log(`[${index + 1}/${script.segments.length}] Generating mermaid`)

                const { text: mermaidCode } = await openai.complete(Agent.MERMAID_GENERATOR, `Specification: ${segment.illustration.description} \n\nContext: ${segment.text}`);
                const exportedMermaid = await mermaid.exportMermaid(mermaidCode, index);

                mediaSrc = exportedMermaid.mediaSrc;
                break;

            case 'query': 
                console.log(`[${index + 1}/${script.segments.length}] Searching for image`);

                const imageSearched = await google.searchImage(segment.illustration.description, index)
                
                mediaSrc = imageSearched.mediaSrc
                break;

            case 'code': 
                console.log(`[${index + 1}/${script.segments.length}] Generating code`)

                const codeGenerated = await shiki.exportCode(segment.illustration.description, index);
                
                mediaSrc = codeGenerated.mediaSrc;
                break;

            case 'image_generation': 
            default: 
                console.log(`[${index + 1}/${script.segments.length}] Generating image`);
                const mediaGenerated = await gemini.generate(segment.illustration.description, index);
                
                mediaSrc = mediaGenerated.mediaSrc;
                break;
        }

        script.segments[index].mediaSrc = mediaSrc;
    }
}

console.log("Generating SEO content...");
const { text: seoText } = await openai.complete(Agent.SEO_WRITER, review)
const seo = JSON.parse(seoText);

await scriptManagerClient.saveScript(script, seo, [], ENABLED_FORMATS, path.basename(scriptTextFile));

console.log(`Cleaning up assets...`)
for (const segment of script.segments) {
    if (segment.mediaSrc) {
        const imagePath = path.join(publicDir, segment.mediaSrc);
        fs.unlinkSync(imagePath);
    }
}

fs.unlinkSync(scriptTextFile);

if (fs.existsSync(path.join(publicDir, 'audio-full-script.wav'))) {
    fs.unlinkSync(path.join(publicDir, 'audio-full-script.wav'));
}

if (fs.existsSync(path.join(publicDir, 'audio-full-script-SpeedUp.wav'))) {
    fs.unlinkSync(path.join(publicDir, 'audio-full-script-SpeedUp.wav'));
}