 
import fs from 'fs'
import path from 'path';
import { v4 } from 'uuid';

import { ENV } from '../config/env';
import { outputDir, publicDir } from '../config/path';
import { Orientation } from '../config/types';
import { ImageGeneratorClient, GenerationParams, ThumbnailParams } from './interfaces/ImageGenerator';
import { Agents, LLMClient, Agent, AgentOutput, CODEX_DEFAULT_MODEL } from './interfaces/LLM';
import { titleToFileName } from '../utils/title-to-filename';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';

export const REFRESH_URL = "https://auth.openai.com/oauth/token";
export const CODEX_API_URL = "https://chatgpt.com/backend-api/codex/responses";
export const CODEX_SCOPE = "openid profile email offline_access";

type ServerSentEvent = {
    event: string;
    data: string;
}

export class CodexClient implements ImageGeneratorClient, LLMClient {
    private accessToken: string | null = null;

    private async init(): Promise<void> {
        const response = await fetch(REFRESH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                client_id: ENV.CODEX_CLIENT_ID,
                refresh_token: ENV.CODEX_REFRESH_TOKEN,
                scope: CODEX_SCOPE,
            })
        })

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[CODEX] Failed to refresh Codex access token: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as Record<string, any>;
        if (!data.access_token) {
            throw new Error(`[CODEX] No access token returned from Codex refresh: ${JSON.stringify(data)}`);
        }

        this.accessToken = data.access_token;
        console.log(`[CODEX] Successfully refreshed access token`);        
    }

    private async getHeaders() {
        if (!this.accessToken) {
            await this.init();
        }

        const headers = new Headers();
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        headers.set('chatgpt-account-id', ENV.CODEX_ACCOUNT_ID);
        headers.set("OpenAI-Beta", "responses=experimental");
        headers.set('Content-Type', 'application/json');
        headers.set('Accept', 'text/event-stream');

        return headers;
    }

    private parseEventBlock(block: string): ServerSentEvent {
        const event: ServerSentEvent = {} as ServerSentEvent;
        const dataLines: string[] = [];

        for (const line of block.split(/\r?\n/)) {
            if (line.startsWith('event:')) {
                event.event = line.replace('event:', '').trim();
                continue
            }

            if (line.startsWith('data:')) {
                dataLines.push(line.replace('data:', '').trim());
            }
        }

        if (dataLines.length > 0) {
            event.data = dataLines.join('\n');
        }

        return event
    }

    private async* iterateServerSentEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<ServerSentEvent> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    if (buffer.trim()) {
                        yield this.parseEventBlock(buffer);
                    }

                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n\n')) >= 0) {
                    const block = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 2);

                    if (block) {
                        yield this.parseEventBlock(block);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private async saveImage(
        stream: AsyncGenerator<Partial<ServerSentEvent>>, 
        id: string | number,
        destination = publicDir
    ): Promise<{ mediaSrc?: string; }> {
        let fullBase64 = '';

        for await (const event of stream) {
            if (!event.data || event.data === "[DONE]") continue;

            try {
                const payload = JSON.parse(event.data);

                if (payload.type === "response.output_text.delta" && payload.delta) {
                    console.log(`[CODEX] Image generation progress: ${payload.delta}`);
                }

                if (payload.type === "response.image_generation_call.partial_image" && payload.partial_image_b64) {
                    fullBase64 += payload.partial_image_b64;
                }

                if (payload.type === "response.output_item.done" && payload.item?.type === "image_generation_call") {
                    let b64Data = payload.item.result
                    if (!b64Data && fullBase64.length > 0) {
                        b64Data = fullBase64;
                    }

                    if (!b64Data) {
                        throw new Error(`[CODEX] No image data found in response`);
                    }

                    const buffer = Buffer.from(b64Data, 'base64');
                    const filename = `image-${id}.png`;
                    const filePath = path.join(destination, filename);
                    fs.writeFileSync(filePath, buffer);
                    
                    return { mediaSrc: filename };
                }
            } catch (error) {
                console.error(`[CODEX] Failed to parse event data: ${event.data}`, error);
            }
        }

        throw new Error(`[CODEX] Stream ended without receiving complete image data`);
    }

    async generate({
        prompt,
        baseImageSrc,
        config,
        id = v4(),
    }: GenerationParams): Promise<{ mediaSrc?: string; }> {
        console.log(`[CODEX] Generating image with prompt: ${prompt}`);

        const response = await fetch(CODEX_API_URL, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                model: CODEX_DEFAULT_MODEL,
                instructions: "You work for a video creation company and your task is to generate an image based on the provided prompt. The image should be visually appealing and relevant to the content of the prompt. If the prompt includes a base image, use it as inspiration for the generated image!",
                stream: true,
                store: false,
                input: [{ 
                        role: 'user', 
                        content: [
                            { type: 'input_text', text: prompt }, 
                            ...(baseImageSrc ? [{ 
                                type: 'input_image', 
                                image_url: `data:image/png;base64,${fs.readFileSync(baseImageSrc).toString('base64')}`, 
                                detail: 'low' 
                                }] : [])
                        ] 
                    }],
                tools: [{ 
                    type: 'image_generation', 
                    quality: 'low', 
                    model: 'gpt-image-2',
                    size: '960x720',
                    ...config,
                }],
                tool_choice: "required"
            })
        })

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`[CODEX] Failed to generate image: ${response.status} - ${response.statusText} - ${errorText}`);
        }

        const stream = this.iterateServerSentEvents(response.body);

        return await this.saveImage(stream, id);
    }

    async generateThumbnail({
        videoTitle,
        orientation,
        customImage,
        thumbnailTextLanguage = 'PORTUGUESE'
    }: ThumbnailParams): Promise<{ mediaSrc?: string; }> {
        console.log(`[CODEX] Generating thumbnail for script: ${videoTitle}`);
        
        const response = await fetch(CODEX_API_URL, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                model: CODEX_DEFAULT_MODEL,
                instructions: `You are a thumbnail generator AI. Your task is to create a thumbnail for a ${orientation === Orientation.PORTRAIT ? 'TikTok' : 'Youtube'} video based on the provided details. Always generate a thumbnail with a ${orientation === Orientation.PORTRAIT ? '9:16' : '16:9'} aspect ratio, suitable for ${orientation === Orientation.PORTRAIT ? 'TikTok' : 'Youtube'}. The thumbnail should be visually appealing and relevant to the content of the video. The text should be concise and engaging, ideally no more than 5 words in ${thumbnailTextLanguage}. The thumbnail should include the person acting some action related to the video topic. Include margins and avoid cutting off parts of the image.`,
                input: [{
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
                tool_choice: "required",
                stream: true,
                store: false,
            })

        })

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`[CODEX] Failed to generate thumbnail: ${response.status} - ${response.statusText} - ${errorText}`);
        }

        const stream = this.iterateServerSentEvents(response.body);

        const filename = `${titleToFileName(videoTitle)}-Thumbnail-${orientation}`;
        const { mediaSrc } = await this.saveImage(stream, filename, outputDir);        

        return { mediaSrc }
    }

    async complete<T extends Agent>(agent: T, prompt: string | unknown, filesSrc?: Array<string>): Promise<AgentOutput<T>> {
        console.log(`[CODEX] Running agent: ${agent}`);
        
        const config = Agents[agent]

        const inputFiles = filesSrc ? filesSrc.map(src => ({
            type: 'input_file' as const,
            filename: path.basename(src),
            file_data: `data:${getMimetypeFromFilename(path.basename(src)).mimeType};base64,${fs.readFileSync(src).toString('base64')}`,
        })) : []

        const response = await fetch(CODEX_API_URL, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                model: config.model.codex,
                instructions: `${config.systemPrompt}\n\nRespond only with the output in a JSON format that strictly follows the structure: ${JSON.stringify(config.outputStructure._def.shape)}, without including any additional text, explanations, or formatting or markdown - only the raw JSON. Always respond with a valid JSON that adheres to the specified structure, even if some fields need to be null or empty. The output should be machine-readable and parsable as JSON.`,
                input: [
                    {
                        role: 'user',
                        content: [
                            { type: 'input_text', text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) },
                            ...inputFiles
                        ]
                    },
                ],
                stream: true,
                store: false,
            })
        })

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`[CODEX] Failed to complete agent ${agent}: ${response.status} - ${response.statusText} - ${errorText}`);
        }

        let fullResponse = '';

        for await (const event of this.iterateServerSentEvents(response.body)) {
            if (event.data && event.data !== "[DONE]") {
                const payload = JSON.parse(event.data);

                if (payload.type === "response.output_text.delta" && payload.delta) {
                    fullResponse += payload.delta;
                }
            }
        }

        try {
            const commonOutputSanitized = fullResponse.replace(/\\n/g, '\\n') // Handle escaped newlines
                .replace(/\\'/g, "\\'") // Handle escaped single quotes
                .replace(/\\"/g, '\\"') // Handle escaped double quotes
                .replace(/```\w*/g, '') // Remove code block markers with optional language specifier
                .replace(/```/g, '') // Remove remaining code block markers
                .trim();

            const jsonOutput = JSON.parse(commonOutputSanitized);
            const parsedOutput = config.outputStructure.safeParse(jsonOutput);

            if (!parsedOutput.success) {
                console.error(`[CODEX] Failed to parse output for agent ${agent}. Validation errors: ${JSON.stringify(parsedOutput.error.issues)}. Original output: ${commonOutputSanitized}`);
                throw new Error(`[CODEX] Output validation failed for agent ${agent}`);
            }

            return parsedOutput.data as AgentOutput<T>;
        } catch (error) {
            console.error(`[CODEX] Failed to parse JSON output for agent ${agent}. Error: ${error instanceof Error ? error.message : String(error)}. Original output: ${fullResponse}`);
            throw new Error(`[CODEX] Failed to parse JSON output for agent ${agent}`);
        }
    }
}