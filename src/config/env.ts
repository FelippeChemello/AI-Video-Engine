import { z } from 'zod';
import { config } from 'dotenv';

config({ path: '.env', override: true });

const envSchema = z.object({
    NODE_ENV: z.string().default('development'),
    
    GEMINI_PAID_API_KEY: z.string(),
    GOOGLE_SERP_API_KEY: z.string(),
    GOOGLE_SERP_ID: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GMAIL_REFRESH_TOKEN: z.string(),
    YOUTUBE_REFRESH_TOKEN_CODESTACK: z.string(),
    YOUTUBE_REFRESH_TOKEN_ALMA_DE_TERREIRO: z.string(),
    
    AENEAS_BASE_URL: z.string(),
    AENEAS_API_KEY: z.string(),

    MFA_BASE_URL: z.string(),
    MFA_API_KEY: z.string(),

    QWEN_TTS_BASE_URL: z.string(),
    QWEN_TTS_API_KEY: z.string(),
    
    OPENAI_API_KEY: z.string(),
    OPENAI_FELIPPE_FILE_ID: z.string(),
    
    CODEX_CLIENT_ID: z.string().default("app_EMoamEEZ73f0CkXaXp7hrann"), // This is the ChatGPT client ID, which is used for Codex features - https://github.com/SamSaffron/term-llm/blob/main/internal/oauth/chatgpt.go#L23
    CODEX_ACCOUNT_ID: z.string(),
    CODEX_REFRESH_TOKEN: z.string(),

    ANTHROPIC_API_KEY: z.string(),

    GROK_API_KEY: z.string(),
    
    NOTION_TOKEN: z.string(),
    NOTION_DEFAULT_DATABASE_ID: z.string(),

    ELEVENLABS_API_KEY: z.string(),

    FISH_AUDIO_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = envSchema.parse(process.env);