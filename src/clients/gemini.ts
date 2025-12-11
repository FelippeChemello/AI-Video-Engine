/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
import fs, { writeFileSync } from 'fs'
import { GoogleGenAI } from '@google/genai'
import path from 'path';
import mime from 'mime';

import { ImageGeneratorClient } from './interfaces/ImageGenerator';
import { ENV } from '../config/env';
import { outputDir, publicDir } from '../config/path';
import { v4 } from 'uuid';
import { Speaker, TTSClient, voices } from './interfaces/TTS';
import { Orientation, Script } from '../config/types';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { Agent, Agents, LLMClient } from './interfaces/LLM';
import { titleToFileName } from '../utils/title-to-filename';
import { convertToWav } from '../utils/save-wav-file';
import { sleep } from '../utils/sleep';

const genAI = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY })
const genAIPro = new GoogleGenAI({ apiKey: ENV.GEMINI_PAID_API_KEY })

export class GeminiClient implements ImageGeneratorClient, TTSClient, LLMClient {
    async synthesize(_: Speaker, text: string, id?: string | number): Promise<{ audioFileName: string; duration: number; }> {
        throw new Error('Method not implemented.');
    }

    async synthesizeScript(script: Script, id?: string | number): Promise<{ audioFileName: string; duration: number; }> {
        const prompt = `
Read aloud this conversation between Felippe and his dog Cody.
Generate only the audio without any additional commentary or text.
Felippe is known for his vast knowledge, and Cody is a curious dog who is always asking questions about the world, both are Brazilian Portuguese speakers and have a fast-paced, energetic, and enthusiastic way of speaking.

${script.map((s) => `${s.speaker}: ${s.text}`).join('\n')}
        `;

        console.log(`[GEMINI] Synthesizing script`);
        
        let data: string | undefined;
        let mimeType: string | undefined;
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const audioResult = await genAIPro.models.generateContent({
                    model: 'gemini-2.5-pro-preview-tts',
                    contents: [{ parts: [{ text: prompt }] }],
                    config: {
                        responseModalities: ['audio'],
                        speechConfig: {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: [
                                    {
                                        speaker: Speaker.Cody,
                                        voiceConfig: {
                                            prebuiltVoiceConfig: { voiceName: voices.Cody.gemini }
                                        }
                                    },
                                    {
                                        speaker: Speaker.Felippe,
                                        voiceConfig: {
                                            prebuiltVoiceConfig: { voiceName: voices.Felippe.gemini }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                })

                data = audioResult.candidates?.[0].content?.parts?.[0]?.inlineData?.data
                mimeType = audioResult.candidates?.[0].content?.parts?.[0]?.inlineData?.mimeType
                
                if (!data || !mimeType) {
                    throw new Error('No audio data found in the response');
                }
                
                break;
            } catch (error) {
                retries++;
                console.log(`[GEMINI] Error synthesizing audio: ${error}. Retry ${retries}/${maxRetries}`);
                
                if (retries >= maxRetries) {
                    throw new Error(`[GEMINI] Failed to synthesize audio after ${maxRetries} attempts`);
                }
            }
        }

        if (!data || !mimeType) {
            throw new Error('No audio data found after retries');
        }

        let audioBuffer = Buffer.from(data, 'base64')
        let fileExtension = mime.getExtension(mimeType!)
        if (!fileExtension) {
            fileExtension = 'wav'
            audioBuffer = convertToWav(data, mimeType!)
        }

        const audioFileName = `audio-${id}.${fileExtension}`;
        const filePath = `${publicDir}/${audioFileName}`

        writeFileSync(filePath, audioBuffer, 'utf-8')

        console.log(`[GEMINI] Audio synthesized successfully: ${filePath}`);

        const duration = await getAudioDurationInSeconds(filePath);
        console.log(`[GEMINI] Audio duration: ${duration}`);

        return { audioFileName, duration }
    }

    async generate(prompt: string, id: string | number = v4()) {
        try {
            console.log(`[GEMINI] Generating image with prompt: ${prompt}`);

            const imageResult = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: `Generate an image for the following prompt: ${prompt}`,
                config: { 
                    responseModalities: ['text', 'image'],
                    imageConfig: { aspectRatio: '4:3' },
                    systemInstruction: 'You are a professional illustration art director specialized in creating consistent, visually striking, and story-supportive illustrations for short-form educational and news videos. Your goal is to translate each scene or paragraph of the script into a clear visual reference, defining what should be illustrated, how, and why — keeping the audience’s attention and the video’s pacing in mind.'
                },
            })

            const parts = imageResult.candidates![0].content?.parts!
            for (const part of parts) {
                if (part.text) {
                    console.log(`[GEMINI] Text response: ${part.text}`);
                    continue
                }

                if (part.inlineData) {
                    const mimeType = part.inlineData.mimeType
                    const base64Data = part.inlineData.data
                    if (!base64Data) {
                        throw new Error('No base64 data found in the response');
                    }

                    console.log(`[GEMINI] Image generated successfully: ${mimeType}`);

                    const imageBuffer = Buffer.from(base64Data, 'base64')

                    const filename = `image-${id}.png`
                    const filePath = `${publicDir}/${filename}`
                    fs.writeFileSync(filePath, imageBuffer)
                    console.log(`[GEMINI] Image saved to ${filePath}`);
                    
                    return { mediaSrc: filename }
                }
            }

            throw new Error('No image data found in the response');
        } catch (error) {
            console.log(`[GEMINI] Error generating image: ${error}`);
            
            return { mediaSrc: undefined }
        }
    }

    async generateThumbnail(videoTitle: string, orientation: Orientation): Promise<{ mediaSrc?: string; }> {
        let mediaSrc: string | undefined

        console.log(`[GEMINI] Generating thumbnail for script: ${videoTitle}`);

        const felippeImg = fs.readFileSync(path.resolve(publicDir, 'assets', 'felippe.png')).toString('base64')

        const imageResult = await genAI.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                { text: `You are a thumbnail generator AI. Your task is to create a thumbnail for a ${orientation === 'Portrait' ? 'TikTok' : 'Youtube'} video based on the provided details. Always generate a thumbnail with a ${orientation === 'Portrait' ? '9:16' : '16:9'} aspect ratio, suitable for ${orientation === 'Portrait' ? 'TikTok' : 'Youtube'}. The thumbnail should be visually appealing and relevant to the content of the video. The text should be concise and engaging, ideally no more than 5 words in PORTUGUESE. The thumbnail should include Felippe acting some action related to the video topic. Include margins and avoid cutting off parts of the image.` },
                { text: `Video Title: ${videoTitle}` },
                { inlineData: { mimeType: 'image/png', data: felippeImg } }
            ],
            config: { 
                responseModalities: ['text', 'image'],
                imageConfig: { aspectRatio: '4:3' },
            }
        })

        const parts = imageResult.candidates![0].content?.parts!
        for (const part of parts) {
            if (part.text) {
                console.log(`[GEMINI] Text response: ${part.text}`);
                continue
            }

            if (part.inlineData) {
                const mimeType = part.inlineData.mimeType
                const base64Data = part.inlineData.data
                if (!base64Data) {
                    throw new Error('No base64 data found in the response');
                }

                console.log(`[GEMINI] Thumbnail generated successfully: ${mimeType}`);

                const imageBuffer = Buffer.from(base64Data, 'base64')

                const filename = `${titleToFileName(videoTitle)}-Thumbnail-${orientation}.png`;
                const imagePath = path.join(outputDir, filename);
                if (imageBuffer) {
                    fs.writeFileSync(imagePath, imageBuffer);
                    mediaSrc = filename;
                }
                console.log(`[GEMINI] Image saved to ${imagePath}`);
                
                return { mediaSrc: filename }
            }
        }

        return { mediaSrc }
    }

    async complete(agent: Agent, prompt: string): Promise<{ text: string }> {
        console.log(`[GEMINI] Running agent: ${agent}`);

        const maxRetries = 10;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const response = await genAI.models.generateContent({
                    model: Agents[agent].model.gemini,
                    contents: prompt,
                    config: {
                        systemInstruction: Agents[agent].systemPrompt,
                        responseModalities: ['text'],
                        maxOutputTokens: 65536,
                        temperature: 0.7,
                        tools: [{ googleSearch: {} }, { urlContext: {} }],
                        thinkingConfig: {
                            thinkingBudget: 4096,
                        }    
                    }
                });

                const text = response.text
                if (!text) {
                    throw new Error('No text response from Gemini');
                }

                const parsedResponse = Agents[agent].responseParser(text);

                return { text: parsedResponse };
            } catch (error: any) {
                retries++;
                console.log(`[GEMINI] Error during completion: ${error}. Retry ${retries}/${maxRetries}`);
                
                if (retries >= maxRetries) {
                    throw new Error(`[GEMINI] Max retries reached. Model still overloaded.`);
                }
                
                await sleep(30000);
        }
        }

        throw new Error(`[GEMINI] Failed to complete after ${maxRetries} retries`);
    }
}