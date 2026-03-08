 
import { Anthropic } from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { ENV } from '../config/env';
import { Agents, LLMClient, Agent, AgentOutput } from './interfaces/LLM';

const anthropic = new Anthropic({
    apiKey: ENV.ANTHROPIC_API_KEY,
});

export class AnthropicClient implements LLMClient {
    async complete<T extends Agent>(agent: T, prompt: string | unknown): Promise<AgentOutput<T>> {
        console.log(`[ANTHROPIC] Running agent: ${agent}`);
        
        const config = Agents[agent]

        const response = await anthropic.messages.parse({
            model: config.model.anthropic,
            system: config.systemPrompt,
            max_tokens: 16000,
            messages: [
                { role: 'user', content: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }
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