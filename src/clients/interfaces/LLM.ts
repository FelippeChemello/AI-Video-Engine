import fs from 'fs';
import path from 'path';

import { promptsDir } from '../../config/path';

export enum Agent {
    SCRIPT_WRITER = 'SCRIPT_WRITER',
    SCRIPT_REVIEWER = 'SCRIPT_REVIEWER',
    SEO_WRITER = 'SEO_WRITER',
    RESEARCHER = 'RESEARCHER',
    MERMAID_GENERATOR = 'MERMAID_GENERATOR',
    NEWS_REFINER = 'NEWS_REFINER',
    NEWS_RESEARCHER = 'NEWS_RESEARCHER',
    NEWSLETTER_WRITER = 'NEWSLETTER_WRITER',
    NEWSLETTER_REVIEWER = 'NEWSLETTER_REVIEWER',
    DEBATE_COUNCIL = 'DEBATE_COUNCIL',
    DEBATE = 'DEBATE',
}

enum ModelProvider {
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    GEMINI = 'gemini',
    GROK = 'grok',
}

export const Agents: {
    [name in Agent]: {
        systemPrompt: string;
        model: { [K in ModelProvider]: string };
        responseParser: (response: string) => string;
    };
} = {
    RESEARCHER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'researcher.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => response.trim(),
    },
    NEWS_RESEARCHER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'news-researcher.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => response.trim(),
    },
    NEWS_REFINER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'news-refiner.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => response.trim(),
    },
    NEWSLETTER_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'newsletter-writer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    SCRIPT_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'writer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    SCRIPT_REVIEWER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'reviewer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    NEWSLETTER_REVIEWER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'newsletter-reviewer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    SEO_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'seo.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    MERMAID_GENERATOR: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'mermaid-generator.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        responseParser: (response: string) => response.trim()
    },
    DEBATE: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'debate.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-haiku-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash-lite',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
    DEBATE_COUNCIL: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'debate-council.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.1',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        responseParser: (response: string) => {
            const match = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            return match ? match[0] : response.replace(/```\w*\n/g, '').replace(/```/g, '').trim();
        },
    },
}

export interface LLMClient {
    complete(agent: Agent, prompt: string): Promise<{ text: string }>;
}