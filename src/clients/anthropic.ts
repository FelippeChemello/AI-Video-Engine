import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { ENV } from '../config/env';
import { Agents, LLMClient, Agent, AgentOutput } from './interfaces/LLM';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';

const anthropic = new Anthropic({
    apiKey: ENV.ANTHROPIC_API_KEY,
});

export class AnthropicClient implements LLMClient {
    async complete<T extends Agent>(agent: T, prompt: string | unknown, filesSrc?: Array<string>): Promise<AgentOutput<T>> {
        console.log(`[ANTHROPIC] Running agent: ${agent}`);
        
        const config = Agents[agent]

        const inputFiles = filesSrc
            ? filesSrc.map(src => {
                const { mimeType, type } = getMimetypeFromFilename(path.basename(src));

                return {
                    type: type === 'image' ? 'image' as const : 'document' as const,
                    source: {
                        type: 'base64' as const,
                        media_type: mimeType as any,
                        data: fs.readFileSync(src).toString('base64')
                    }
                }
            }) : []

        const response = await anthropic.messages.parse({
            model: config.model.anthropic,
            system: config.systemPrompt,
            max_tokens: 16000,
            messages: [
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) },
                        ...inputFiles
                    ] 
                }
            ],
            output_config: { format: zodOutputFormat(config.outputStructure) }
        })

        const output = response.parsed_output;

        if (!output) {
            throw new Error(`[ANTHROPIC] Failed to get parsed output from Anthropic response for agent ${agent}`);
        }

        return output as AgentOutput<T>;
    }
}