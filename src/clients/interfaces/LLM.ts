import fs from 'fs';
import path from 'path';

import { promptsDir } from '../../config/path';
import { z } from 'zod';

export enum Agent {
    SCRIPT_WRITER = 'SCRIPT_WRITER',
    SCRIPT_REVIEWER = 'SCRIPT_REVIEWER',
    RESEARCHER = 'RESEARCHER',

    SEO_WRITER = 'SEO_WRITER',
    MERMAID_GENERATOR = 'MERMAID_GENERATOR',
    NEWS_RESEARCHER = 'NEWS_RESEARCHER',

    NEWSLETTER_WRITER = 'NEWSLETTER_WRITER',
    NEWSLETTER_REVIEWER = 'NEWSLETTER_REVIEWER',

    DEBATE_COUNCIL = 'DEBATE_COUNCIL',
    DEBATE = 'DEBATE',

    TINDER_ROAST = 'TINDER_ROAST',
}

enum ModelProvider {
    OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    GEMINI = 'gemini',
    GROK = 'grok',
}

type AgentConfig = {
    systemPrompt: string;
    model: { [K in ModelProvider]: string };
    outputStructure: z.ZodTypeAny;
}

export const Agents = {
    RESEARCHER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'researcher.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
            research: z.string(),
        }),
    },
    NEWS_RESEARCHER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'news-researcher.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
            news: z.array(z.object({
                headline: z.string(),
                summary: z.string(),
                source: z.string(),
            })),
        }),
    },
    NEWSLETTER_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'newsletter-writer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        outputStructure: z.object({
            scripts: z.array(z.object({
                title: z.string(),
                segments: z.array(z.object({
                    speaker: z.enum(['Felippe', 'Cody']),
                    text: z.string(),
                    illustration: z.object({
                        type: z.enum(['query', 'image_generation', 'mermaid', 'code']),
                        description: z.string(),
                    }).optional().nullable(),
                })),
            })),
        }),
    },
    SCRIPT_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'writer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        outputStructure: z.object({
            scripts: z.array(z.object({
                title: z.string(),
                segments: z.array(z.object({
                    speaker: z.enum(['Felippe', 'Cody']),
                    text: z.string(),
                    illustration: z.object({
                        type: z.enum(['query', 'image_generation', 'mermaid', 'code']),
                        description: z.string(),
                    }).optional().nullable(),
                })),
            }))
        })
    },
    TINDER_ROAST: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'tinder-roasting-story-writer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-5',
            [ModelProvider.GEMINI]: 'gemini-2.5-flash',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
          meta: z.object({
            video_title: z.string(),
            video_description: z.string(),
            video_hashtags: z.array(z.string()),
            archetype_used: z.string(),
          }),
          profile: z.object({
            name: z.string(),
            age: z.number(),
            job: z.string(),
            location: z.string(),
            main_photo_description: z.string(),
            photos: z.array(z.string()),
            bio: z.string(),
          }),
          script: z.object({
            video_intro: z.string(),
            intro: z.string(),
            photo_roasts: z.array(z.string()),
            bio_roast: z.array(z.object({
              target: z.string(),
              narration: z.string(),
            })),
            decision: z.object({
              verdict: z.string(),
              swipe_direction: z.enum(['left', 'right']),
            }),
          })
        })
    },
    SCRIPT_REVIEWER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'reviewer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
            scripts: z.array(z.object({
                title: z.string(),
                segments: z.array(z.object({
                    speaker: z.enum(['Felippe', 'Cody']),
                    text: z.string(),
                    illustration: z.object({
                        type: z.enum(['query', 'image_generation', 'mermaid', 'code']),
                        description: z.string(),
                    }).optional().nullable(),
                })),
            }))
        })
    },
    NEWSLETTER_REVIEWER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'newsletter-reviewer.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
            scripts: z.array(z.object({
                title: z.string(),
                segments: z.array(z.object({
                    speaker: z.enum(['Felippe', 'Cody']),
                    text: z.string(),
                    illustration: z.object({
                        type: z.enum(['query', 'image_generation', 'mermaid', 'code']),
                        description: z.string(),
                    }).optional().nullable(),
                })),
            }))
        })
    },
    SEO_WRITER: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'seo.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        outputStructure: z.object({
            title: z.string(),
            description: z.string(),
            tags: z.array(z.string()),
            hashtags: z.array(z.string()),
        }),
    },
    MERMAID_GENERATOR: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'mermaid-generator.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        outputStructure: z.object({
            mermaid: z.string(),
        }),
    },
    DEBATE: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'debate.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-haiku-4-5',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-non-reasoning',
        },
        outputStructure: z.object({
            position: z.string(),
        })
    },
    DEBATE_COUNCIL: {
        systemPrompt: fs.readFileSync(path.resolve(promptsDir, 'debate-council.md'), 'utf-8'),
        model: {
            [ModelProvider.OPENAI]: 'gpt-5.4',
            [ModelProvider.ANTHROPIC]: 'claude-sonnet-4-6',
            [ModelProvider.GEMINI]: 'gemini-3.1-pro-preview',
            [ModelProvider.GROK]: 'grok-4-1-fast-reasoning',
        },
        outputStructure: z.object({
            title: z.string(),
            winner: z.enum(['Gemini', 'Grok', 'Claude', 'ChatGPT']).optional().nullable(),
            reasoning: z.string(),
            ending: z.string(),
        })
    },
} satisfies Record<Agent, AgentConfig>;

export type AgentOutput<T extends Agent> = z.infer<typeof Agents[T]['outputStructure']>;

export interface LLMClient {
    complete<T extends Agent>(agent: T, prompt: string | unknown): Promise<AgentOutput<T>>;
}