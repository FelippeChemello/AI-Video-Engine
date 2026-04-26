import { AnthropicClient } from "../clients/anthropic";
import { CodexClient } from "../clients/codex";
import { GeminiClient } from "../clients/gemini";
import { GrokClient } from "../clients/grok";
import { Agent, AgentOutput, LLMClient, ModelProvider } from "../clients/interfaces/LLM";
import { OpenAIClient } from "../clients/openai";

const codex: LLMClient = new CodexClient();
const gemini: LLMClient = new GeminiClient();
const openai: LLMClient = new OpenAIClient();
const claude: LLMClient = new AnthropicClient();
const grok: LLMClient = new GrokClient();

const llmEnginesMap: Record<ModelProvider, LLMClient> = {
    [ModelProvider.CODEX]: codex,
    [ModelProvider.GEMINI]: gemini,
    [ModelProvider.OPENAI]: openai,
    [ModelProvider.ANTHROPIC]: claude,
    [ModelProvider.GROK]: grok,
};

export type LLMRequest<T extends Agent> = {
    agent: T;
    prompt: string;
    filesSrc?: Array<string>;
    providers?: Array<ModelProvider>;
};

export async function generateLLMResponse<T extends Agent>({
    agent,
    prompt,
    filesSrc = [],
    providers = [ModelProvider.CODEX, ModelProvider.GEMINI, ModelProvider.OPENAI, ModelProvider.ANTHROPIC],
}: LLMRequest<T>): Promise<AgentOutput<T>> {
    const engines = providers.map(provider => llmEnginesMap[provider]).filter(engine => engine !== undefined);

    for (const engine of engines) {
        try {
            const response = await engine.complete<T>(agent, prompt, filesSrc);
            if (response) {
                return response;
            }
        } catch (error) {
            console.error(`Error generating response with ${engine.constructor.name}:`, error);
        }
    }

    throw new Error("All LLM engines failed to generate a response.");
}
