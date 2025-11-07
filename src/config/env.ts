import { z } from 'zod';
import { config } from 'dotenv';

config({ path: '.env', override: true });

const envSchema = z.object({
    NODE_ENV: z.string().default('development'),
    
    GEMINI_API_KEY: z.string(),
    GOOGLE_SERP_API_KEY: z.string(),
    GOOGLE_SERP_ID: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GMAIL_REFRESH_TOKEN: z.string(),
    YOUTUBE_REFRESH_TOKEN: z.string(),
    
    AENEAS_BASE_URL: z.string(),
    AENEAS_API_KEY: z.string(),

    MFA_BASE_URL: z.string(),
    MFA_API_KEY: z.string(),
    
    OPENAI_API_KEY: z.string(),
    OPENAI_FELIPPE_FILE_ID: z.string(),

    ANTHROPIC_API_KEY: z.string(),
    
    NOTION_TOKEN: z.string(),
    NOTION_DEFAULT_DATABASE_ID: z.string(),
    NOTION_NEWS_DATABASE_ID: z.string().optional(),

    ELEVENLABS_API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const ENV = envSchema.parse(process.env);