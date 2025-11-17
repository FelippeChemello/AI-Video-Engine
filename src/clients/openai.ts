 
import fs from 'fs'
import OpenAI from 'openai'
import path from 'path';
import { v4 } from 'uuid';

import { ENV } from '../config/env';
import { outputDir, publicDir } from '../config/path';
import { TTSClient } from './interfaces/TTS';
import { Script, Speaker } from '../config/types';
import { concatAudioFiles } from '../utils/concat-audio-files';
import { ImageGeneratorClient } from './interfaces/ImageGenerator';
import { Agents, LLMClient, Agent } from './interfaces/LLM';
import { titleToFileName } from '../utils/title-to-filename';

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

const voices: { [key in keyof typeof Speaker]: string } = {
    Cody: 'coral',
    Felippe: 'ash',
}

const voicePrompt: { [key in keyof typeof Speaker]: string } = {
    Cody: 'Brazilian, Bright, energetic, neutral accent with playful tones and friendly curiosity. Inquisitive and slightly excitable, genuinely amazed and eager to learn about new things. Very Quick Pace, spontaneous questions with natural enthusiasm, balanced by moments of thoughtful curiosity.',
    Felippe: 'Brazilian, Bright, energetic, young, neutral accent, sophisticated, with clear articulation. Slightly professorial, speaking with pride and confidence in his vast knowledge, yet always approachable. Clearly articulate Portuguese and technical terms authentically. Very Fast Paced.',
}

export class OpenAIClient implements TTSClient, ImageGeneratorClient, LLMClient {
    async synthesize(speaker: Speaker, text: string, id?: string | number) {
        console.log(`[OPENAI] Synthesizing speech for speaker: ${speaker}, text length: ${text.length}`);
        
        const response = await openai.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice: voices[speaker],
            instructions: voicePrompt[speaker],
            input: text,
        })

        const speechFile = `audio-${typeof id === 'undefined' ? v4() : id}.mp3`
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(path.join(publicDir, speechFile), buffer);

        return {
            audioFileName: speechFile,
        }
    }

    async synthesizeScript(script: Script, id?: string | number) {
        const audioFileName = `audio-${typeof id === 'undefined' ? v4() : id}.mp3`;
        const filePath = path.join(publicDir, audioFileName);
        
        console.log(`[OPENAI] Synthesizing script`);
        const audioPromises = script
            .filter((segment) => segment.text && segment.text.trim() !== '')
            .reduce((acc, segment) => {
                const lastSpeaker = acc.length > 0 ? acc[acc.length - 1].speaker : null;
                if (lastSpeaker === segment.speaker) {
                    acc[acc.length - 1].text += ` ${segment.text}`;
                } else {
                    acc.push({ speaker: segment.speaker, text: segment.text });
                }
                
                return acc;
            }, [] as { speaker: Speaker, text: string }[])
            .map(async (segment, index) => this.synthesize(segment.speaker, segment.text, index))           

        const audioResults = await Promise.all(audioPromises);

        await concatAudioFiles(
            audioResults.map((result) => path.join(publicDir, result.audioFileName)),
            filePath
        );

        console.log(`[OPENAI] Merged audio file created`);

        return { audioFileName }
    }

    async generate(prompt: string, id?: string | number): Promise<{ mediaSrc?: string; }> {
        console.log(`[OPENAI] Generating image with prompt: ${prompt}`);
        
        const response = await openai.responses.create({
            model: 'gpt-4.1-mini',
            input: prompt,
            tools: [{ 
                type: 'image_generation', 
                quality: 'medium', 
                background: 'opaque',
                model: 'gpt-image-1-mini'
            }],
        })

        const imageData = response.output
            .filter(out => out.type === 'image_generation_call')

        let mediaSrc: string | undefined
        for (let i = 0; i < imageData.length; i++) {
            const image = imageData[i]

            // @ts-expect-error image is not typed correctly in the OpenAI client
            console.log(`[OPENAI] Generated image with quality ${image.quality}: ${image.revised_prompt}`);

            const filename = `image-${typeof id === 'undefined' ? v4() : id}-${i}.png`;
            const imagePath = path.join(publicDir, filename);
            
            if (image.result) {
                fs.writeFileSync(imagePath, Buffer.from(image.result, 'base64'));
                mediaSrc = filename;
            }
        }

        return { mediaSrc }
    }

    async generateThumbnail(
        videoTitle: string, 
        orientation: 'Portrait' | 'Landscape'
    ): Promise<{ mediaSrc?: string; }> {
        console.log(`[OPENAI] Generating thumbnail for script: ${videoTitle}`);
        
        const felippeFileId = ENV.OPENAI_FELIPPE_FILE_ID;

        const response = await openai.responses.create({
            model: 'gpt-4.1',
            input: [{
                role: 'system',
                content: `You are a thumbnail generator AI. Your task is to create a thumbnail for a ${orientation === 'Portrait' ? 'TikTok' : 'Youtube'} video based on the provided details. Always generate a thumbnail with a ${orientation === 'Portrait' ? '9:16' : '16:9'} aspect ratio, suitable for ${orientation === 'Portrait' ? 'TikTok' : 'Youtube'}. The thumbnail should be visually appealing and relevant to the content of the video. The text should be concise and engaging, ideally no more than 5 words in PORTUGUESE. The thumbnail should include Felippe acting some action related to the video topic. Include margins and avoid cutting off parts of the image.`
            }, {
                role: 'user',
                content: [
                    {
                        type: 'input_text',
                        text: `A imagem de referência é uma ilustração de Felippe, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}".`,
                    },
                    {
                        type: 'input_image',
                        file_id: felippeFileId,
                        detail: 'low',
                    }
                ]
            }],
            tools: [{ type: 'image_generation', quality: 'high', background: 'opaque', input_fidelity: 'low', output_format: 'png', size: '1024x1536' }],
        })

        const imageData = response.output.find(out => out.type === 'image_generation_call');

        // @ts-expect-error imageData contains revised_prompt
        console.log(`[OPENAI] Thumbnail generated with the following prompt: ${imageData?.revised_prompt}`);        

        let mediaSrc: string | undefined

        const filename = `${titleToFileName(videoTitle)}-Thumbnail-${orientation}.png`;
        const imagePath = path.join(outputDir, filename);
        if (imageData) {
            fs.writeFileSync(imagePath, Buffer.from(imageData.result!, 'base64'));
            mediaSrc = filename;
        }

        return { mediaSrc }
    }

    async complete(agent: Agent, prompt: string): Promise<{ text: string }> {
        console.log(`[OPENAI] Running agent: ${agent}`);
        
        const response = await openai.responses.create({
            model: Agents[agent].model.openai,
            instructions: Agents[agent].systemPrompt,
            input: prompt,
        });

        const text = response.output_text
        const parsedResponse = Agents[agent].responseParser(text);

        return { text: parsedResponse };
    }
}