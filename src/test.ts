import { CodexClient } from "./clients/codex";
import { GeminiClient } from "./clients/gemini";
import { OpenAIClient } from "./clients/openai";
import { Channels, Compositions } from "./config/types";
import { generateThumbnails } from "./services/generate-thumbnails";

await generateThumbnails({
    channels: [Channels.ALMA_DE_TERREIRO_UMBANDA],
    compositions: [Compositions.ReligiousPortraitVideo],
    videoTitle: "O que é Efum?",
    engines: [new CodexClient()],
})