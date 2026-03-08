import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod'

import { ENV } from '../config/env';
import { Agent, AgentOutput, Agents, LLMClient } from './interfaces/LLM';

const openai = new OpenAI({
    apiKey: ENV.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

export class GrokClient implements LLMClient {
    async complete<T extends Agent>(agent: T, prompt: string | unknown): Promise<AgentOutput<T>> {
        console.log(`[GROK] Running agent: ${agent}`);

        const config = Agents[agent];

        const response = await openai.responses.parse({
            model: config.model.grok,
            instructions: config.systemPrompt,
            input: [{
                role: 'user',
                content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
            }],
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