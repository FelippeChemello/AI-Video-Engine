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
import { TTSClient } from './clients/interfaces/TTS';
import { KokoroClient } from './clients/kokoro';

const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gemini: LLMClient & ImageGeneratorClient = new GeminiClient();
const kokoro: TTSClient = new KokoroClient();
const mermaid: MermaidRendererClient = new Mermaid();
const shiki: CodeRendererClient = new Shiki();
const google: SearcherClient = new Google();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const ENABLED_FORMATS: Array<'Portrait' | 'Landscape'> = ['Portrait'];

const topic = process.argv[2]
if (!topic) {
    console.error("Please provide a topic as the first argument.");
    process.exit(1);
}

console.log(`Starting research on topic: ${topic}`);
const { text: research } = await gemini.complete(Agent.RESEARCHER, `Tópico: ${topic}`);

console.log("--------------------------")
console.log("Research:")
console.log(research)
console.log("--------------------------")

console.log("Writing script based on research...");
const { text: scriptText } = await openai.complete(Agent.SCRIPT_WRITER, `Tópico: ${topic}\n\n Utilize o seguinte contexto para escrever um roteiro de vídeo:\n\n${research}`);

console.log("Reviewing script...");
const { text: review } = await anthropic.complete(Agent.SCRIPT_REVIEWER, scriptText)
const scripts = JSON.parse(review) as ScriptWithTitle | ScriptWithTitle[];

for (const script of Array.isArray(scripts) ? scripts : [scripts]) {
    fs.writeFileSync(path.join(outputDir, `${titleToFileName(script.title)}.txt`), `
Read aloud this conversation between Felippe and his dog Cody. Cody has a curious and playful personality with an animated character like voice, while Felippe is knowledgeable and enthusiastic.
Felippe is known for his vast knowledge, and Cody is a curious dog who is always asking questions about the world, both are Brazilian Portuguese speakers and have a super very fast-paced, energetic, and enthusiastic way of speaking.

${script.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')}
    `, 'utf-8');

    const audio = await kokoro.synthesizeScript(script.segments, 'full-script');
    script.audioSrc = audio.audioFileName;

    await Promise.all(script.segments.map(async (segment, index) => {
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
                    const mediaGenerated = await openai.generate(segment.illustration.description, index);
                    
                    mediaSrc = mediaGenerated.mediaSrc;
                    break;
            }
    
            script.segments[index].mediaSrc = mediaSrc;
        }
    }));

    console.log("Generating SEO content...");
    const { text: seoText } = await openai.complete(Agent.SEO_WRITER, review)
    const seo = JSON.parse(seoText);

    const thumbnails = [];
    for (const format of ENABLED_FORMATS) {
        console.log(`Generating ${format} thumbnail...`);
        const { mediaSrc: thumbnailSrc } = await openai.generateThumbnail(script.title, seo.description, format)

        if (thumbnailSrc) {
            thumbnails.push(thumbnailSrc);
        }
    }

    await scriptManagerClient.saveScript(script, seo, thumbnails, ENABLED_FORMATS)

    console.log(`Cleaning up assets...`)
    for (const segment of script.segments) {
        if (segment.mediaSrc) {
            const imagePath = path.join(publicDir, segment.mediaSrc);
            fs.unlinkSync(imagePath);
        }
    }
}