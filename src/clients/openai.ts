 
import fs from 'fs'
import OpenAI from 'openai'
import path from 'path';
import { v4 } from 'uuid';

import { ENV } from '../config/env';
import { outputDir, publicDir } from '../config/path';
import { TTSClient, voices, Speaker } from './interfaces/TTS';
import { Orientation, Script } from '../config/types';
import { concatAudioFiles } from '../utils/concat-audio-files';
import { ImageGeneratorClient, GenerationParams, ThumbnailParams } from './interfaces/ImageGenerator';
import { Agents, LLMClient, Agent, AgentOutput, OPENAI_DEFAULT_MODEL } from './interfaces/LLM';
import { titleToFileName } from '../utils/title-to-filename';
import { zodTextFormat } from 'openai/helpers/zod.mjs';
import { cleanupFiles } from '../services/cleanup-files';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';

const openai = new OpenAI({
    apiKey: ENV.OPENAI_API_KEY,
});

export class OpenAIClient implements TTSClient, ImageGeneratorClient, LLMClient {
    async synthesize(speaker: Speaker, text: string, id?: string | number) {
        console.log(`[OPENAI] Synthesizing speech for speaker: ${speaker}, text length: ${text.length}`);
        
        const [voice, voicePrompt] = voices[speaker].openai.split(' - ');
        
        const response = await openai.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice,
            instructions: voicePrompt,
            input: text,
        })

        const speechFile = `audio-${id ?? v4()}.mp3`;
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

        cleanupFiles(audioResults.map((result) => path.join(publicDir, result.audioFileName)));

        console.log(`[OPENAI] Merged audio file created`);

        return { audioFileName }
    }

    async generate({
        prompt,
        baseImageSrc,
        config,
        id
    }: GenerationParams): Promise<{ mediaSrc?: string; }> {
        console.log(`[OPENAI] Generating image with prompt: ${prompt}`);

        const response = await openai.responses.create({
            model: OPENAI_DEFAULT_MODEL,
            input: baseImageSrc 
                ? [{ 
                    role: 'user', 
                    content: [
                        { type: 'input_text', text: prompt }, 
                        { 
                            type: 'input_image', 
                            image_url: `data:image/png;base64,${fs.readFileSync(baseImageSrc).toString('base64')}`, 
                            detail: 'low' 
                        }
                    ] 
                }] 
                : prompt,
            tools: [{ 
                type: 'image_generation', 
                quality: 'low', 
                model: 'gpt-image-2',
                // @ts-expect-error the OpenAI client types are not up to date with the latest API changes
                size: '960x720',
                ...config,
            }],
        })

        const imageData = response.output
            .filter(out => out.type === 'image_generation_call')

        let mediaSrc: string | undefined
        for (let i = 0; i < imageData.length; i++) {
            const image = imageData[i]

            // @ts-expect-error image is not typed correctly in the OpenAI client
            console.log(`[OPENAI] Generated image with quality ${image.quality}: ${image.revised_prompt}`);

            const filename = `openai-${typeof id === 'undefined' ? v4() : id}-${i}.png`;
            const imagePath = path.join(publicDir, filename);
            
            if (image.result) {
                fs.writeFileSync(imagePath, Buffer.from(image.result, 'base64'));
                mediaSrc = filename;
            }
        }

        return { mediaSrc }
    }

    async generateThumbnail({
        videoTitle,
        orientation,
        customImage,
        thumbnailTextLanguage = 'PORTUGUESE'
    }: ThumbnailParams): Promise<{ mediaSrc?: string; }> {
        console.log(`[OPENAI] Generating thumbnail for script: ${videoTitle}`);
        
        // @ts-expect-error the OpenAI client types are not up to date with the latest API changes, and the responses.create method does not allow for the tools parameter yet, but it is required for image generation
        const response = await openai.responses.create({
            model: OPENAI_DEFAULT_MODEL,
            input: [{
                role: 'system',
                content: `You are a thumbnail generator AI. Your task is to create a thumbnail for a ${orientation === Orientation.PORTRAIT ? 'TikTok' : 'Youtube'} video based on the provided details. Always generate a thumbnail with a ${orientation === Orientation.PORTRAIT ? '9:16' : '16:9'} aspect ratio, suitable for ${orientation === Orientation.PORTRAIT ? 'TikTok' : 'Youtube'}. The thumbnail should be visually appealing and relevant to the content of the video. The text should be concise and engaging, ideally no more than 5 words in ${thumbnailTextLanguage}. The thumbnail should include the person acting some action related to the video topic. Include margins and avoid cutting off parts of the image.`
            }, {
                role: 'user',
                content: customImage ? [ 
                    {
                        type: 'input_text',
                        text: customImage.prompt
                    },
                    {
                        type: 'input_image',
                        image_url: `data:image/png;base64,${fs.readFileSync(customImage.src).toString('base64')}`,
                    }
                ] : [
                    {
                        type: 'input_text',
                        text: `Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}".`,
                    }
                ]
            }],
            tools: [{ type: 'image_generation', quality: 'high', background: 'opaque', output_format: 'png', size: orientation === Orientation.PORTRAIT ? '720x1280' : '1280x720', model: 'gpt-image-2' }],
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

    async complete<T extends Agent>(agent: T, prompt: string | unknown, filesSrc?: Array<string>): Promise<AgentOutput<T>> {
        console.log(`[OPENAI] Running agent: ${agent}`);
        
        const config = Agents[agent]

        const inputFiles = filesSrc ? filesSrc.map(src => ({
            type: 'input_file' as const,
            filename: path.basename(src),
            file_data: `data:${getMimetypeFromFilename(path.basename(src)).mimeType};base64,${fs.readFileSync(src).toString('base64')}`,
        })) : []

        const response = await openai.responses.parse({
            model: config.model.openai,
            instructions: config.systemPrompt,
            input: [
                {
                    role: 'user',
                    content: [
                        { type: 'input_text', text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) },
                        ...inputFiles
                    ]
                },
            ],
            text: {
                format: zodTextFormat(config.outputStructure, 'output_parsed'),
            }
        })

        const parsedOutput = response.output_parsed

        if (!parsedOutput) {
            throw new Error(`[OPENAI] Failed to parse response for agent ${agent} `);
        }

        return parsedOutput as AgentOutput<T>;
    }
}