import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod'
import path from 'path';
import fs from 'fs';

import { ENV } from '../config/env';
import { Agent, AgentOutput, Agents, LLMClient } from './interfaces/LLM';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';

const openai = new OpenAI({
    apiKey: ENV.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

export class GrokClient implements LLMClient {
    async complete<T extends Agent>(agent: T, prompt: string | unknown, filesSrc: Array<string>): Promise<AgentOutput<T>> {
        console.log(`[GROK] Running agent: ${agent}`);

        const config = Agents[agent];

        const inputFiles = filesSrc ? filesSrc.map(src => ({
            type: 'input_file' as const,
            filename: path.basename(src),
            file_data: `data:${getMimetypeFromFilename(path.basename(src)).mimeType};base64,${fs.readFileSync(src).toString('base64')}`,
        })) : []

        const response = await openai.responses.parse({
            model: config.model.grok,
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
            // @ts-expect-error xAI specific tools parameter
            tools: [{ type: 'web_search' }, { type: 'x_search' }],
            text: {
                format: zodTextFormat(config.outputStructure, 'output_parsed'),
            }
        })

        const output = response.output_parsed

        if (!output) {
            throw new Error(`[GROK] response did not contain the expected output format for agent ${agent}.`);
        }

        return output;
    }
}