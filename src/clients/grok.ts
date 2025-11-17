
import OpenAI from 'openai';
import { ENV } from '../config/env';
import { Agent, Agents, LLMClient } from './interfaces/LLM';

const openai = new OpenAI({
    apiKey: ENV.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

export class GrokClient implements LLMClient {
    async complete(agent: Agent, prompt: string): Promise<{ text: string }> {
        console.log(`[GROK] Running agent: ${agent}`);

        const response = await openai.responses.create({
            model: Agents[agent].model.grok,
            instructions: Agents[agent].systemPrompt,
            input: prompt,
            // @ts-expect-error xAI specific tools parameter
            tools: [{ type: 'web_search' }, { type: 'x_search' }]
        });

        const text = response.output_text
        const parsedResponse = Agents[agent].responseParser(text);

        return { text: parsedResponse };
    }
}