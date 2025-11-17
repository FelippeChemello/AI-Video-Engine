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
import { Mermaid } from './clients/mermaid';
import { MermaidRendererClient } from './clients/interfaces/MermaidRenderer';
import { SearcherClient } from './clients/interfaces/Searcher';
import { Google } from './clients/google';
import { CodeRendererClient } from './clients/interfaces/CodeRenderer';
import { Shiki } from './clients/shiki';
import { TTSClient } from './clients/interfaces/TTS';
import { ENV } from './config/env';
import { AudioEditorClient } from './clients/interfaces/AudioEditor';
import { FFmpegClient } from './clients/ffmpeg';
import { GrokClient } from './clients/grok';
import { VibeVoiceClient } from './clients/vibevoice';

const scriptManagerClient: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const editor: AudioEditorClient = new FFmpegClient();
const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const vibevoice: TTSClient = new VibeVoiceClient();
const grok: LLMClient = new GrokClient();
const mermaid: MermaidRendererClient = new Mermaid();
const shiki: CodeRendererClient = new Shiki();
const google: SearcherClient = new Google();

const ENABLED_FORMATS: Array<'Portrait' | 'Landscape'> = ['Portrait'];
const MAX_AUDIO_DURATION_FOR_SHORTS = 170;

console.log(`Starting research about the latest news`);
const { text: research } = await grok.complete(Agent.NEWS_RESEARCHER, `Generate detailed research about the latest news in technology, science, health, and world events. Provide comprehensive information with relevant data and context.`);

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

    const scriptTextFile = path.join(outputDir, `${titleToFileName(script.title)}.txt`);
    fs.writeFileSync(scriptTextFile, `
Read aloud this conversation between Felippe and his dog Cody. Cody has a curious and playful personality with an animated character like voice, while Felippe is knowledgeable and enthusiastic.
Felippe is known for his vast knowledge, and Cody is a curious dog who is always asking questions about the world, both are Brazilian Portuguese speakers and have a super very fast-paced, energetic, and enthusiastic way of speaking.

${script.segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')}`, 'utf-8');

    const audio = await vibevoice.synthesizeScript(script.segments, 'full-script');

    if (audio.duration && audio.duration > MAX_AUDIO_DURATION_FOR_SHORTS) {
        console.log(`Audio duration ${audio.duration}s exceeds maximum for shorts. Speeding up audio...`);

        const speedFactor = audio.duration / MAX_AUDIO_DURATION_FOR_SHORTS;
        const audioPath = path.join(publicDir, audio.audioFileName);

        const speededUpAudioPath = await editor.speedUpAudio(audioPath, speedFactor);
        fs.unlinkSync(audioPath);

        audio.audioFileName = path.basename(speededUpAudioPath);
    }

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

    await scriptManagerClient.saveScript(
        script,
        { title: script.title, description: '', hashtags: [], tags: [] }, 
        [],
        ENABLED_FORMATS, 
        path.basename(scriptTextFile)
    );

    console.log(`Cleaning up assets...`)
    for (const segment of script.segments) {
        if (segment.mediaSrc) {
            const imagePath = path.join(publicDir, segment.mediaSrc);
            fs.unlinkSync(imagePath);
        }
    }

    fs.unlinkSync(scriptTextFile);
    fs.unlinkSync(path.join(publicDir, script.audioSrc!));
}