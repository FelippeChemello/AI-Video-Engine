import path from 'path';

import { outputDir, publicDir } from './config/path';
import { Channels, Compositions, Script, ScriptWithTitle } from './config/types';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { GeminiClient } from "./clients/gemini";
import { Speaker, TTSClient } from './clients/interfaces/TTS';
import { GrokClient } from './clients/grok';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { cleanupFiles } from './services/cleanup-files';
import { generateThumbnails } from './services/generate-thumbnails';
import { saveScriptFile } from './services/save-script-file';
import { titleToFileName } from './utils/title-to-filename';
import { synthesizeSpeech } from './services/synthesize-speech';
import { sanitizeText } from './utils/sanitize-text';

const CHANNELS = [Channels.CODESTACK]

const openai: LLMClient & ImageGeneratorClient & TTSClient = new OpenAIClient();
const anthropic: LLMClient = new AnthropicClient();
const gemini: LLMClient & ImageGeneratorClient & TTSClient = new GeminiClient();
const grok: LLMClient = new GrokClient();
const scriptManagerClient: ScriptManagerClient = new NotionClient();

const topics = process.argv.slice(2);
if (!topics.length) {
    console.error("Please provide at least one topic as argument.");
    process.exit(1);
}

const positions: Array<{
    topic: string;
    illustration: string;
    openai: string;
    anthropic: string;
    gemini: string;
    grok: string;
}> = [];

for (const topicIndex in topics) {
    const topic = topics[topicIndex];
    console.log(`\n\nStarting generation for topic: ${topic}`);

    const [
        { position: openaiOpinion },
        { position: anthropicOpinion },
        { position: geminiOpinion },
        { position: grokOpinion },
        { mediaSrc: illustration }
    ] = await Promise.all([
        openai.complete(Agent.DEBATE, `Tópico: ${topic}`).catch(() => ({ position: "O modelo da OpenAI recusou-se a responder." })),
        anthropic.complete(Agent.DEBATE, `Tópico: ${topic}`).catch(() => ({ position: "O modelo da Anthropic recusou-se a responder." })),
        gemini.complete(Agent.DEBATE, `Tópico: ${topic}`).catch(() => ({ position: "O modelo da Gemini recusou-se a responder." })),
        grok.complete(Agent.DEBATE, `Tópico: ${topic}`).catch(() => ({ position: "O modelo da Grok recusou-se a responder." })),
        openai.generate({
          prompt: `Uma ilustração detalhada em estilo moderno que represente um debate sobre o tópico: "${topic}" - A imagem não deve conter background nem nenhum tipo de texto, apenas elementos visuais que representem o tema do debate de forma criativa e simbólica.`,
          config: { background: 'transparent' }
        }),
    ]);

    positions.push({
        topic,
        illustration: illustration || '',
        openai: openaiOpinion,
        anthropic: anthropicOpinion,
        gemini: geminiOpinion,
        grok: grokOpinion,
    });
}

const council = await gemini.complete(Agent.DEBATE_COUNCIL, positions.map(p => `Tópico: ${p.topic} \n\n [OpenAI]: ${p.openai} \n\n [Anthropic]: ${p.anthropic} \n\n [Gemini]: ${p.gemini} \n\n [Grok]: ${p.grok}`).join('\n\n---\n\n'))

const topicsScripted: Script[] = positions.map(p => ([
    { speaker: Speaker.Narrator, text: `[Narrator] ${p.topic}`, mediaSrc: p.illustration },
    { speaker: Speaker.ChatGPT, text: `[ChatGPT] ${p.openai}`, mediaSrc: p.illustration },
    { speaker: Speaker.Claude, text: `[Claude] ${p.anthropic}`, mediaSrc: p.illustration },
    { speaker: Speaker.Grok, text: `[Grok] ${p.grok}`, mediaSrc: p.illustration },
    { speaker: Speaker.Gemini, text: `[Gemini] ${p.gemini}`, mediaSrc: p.illustration }
]))

const landscapeSegments: Script = topicsScripted.flat();
landscapeSegments.push({ speaker: Speaker.Narrator, text: `[Narrator] ${council.reasoning}` })
landscapeSegments.push({ speaker: Speaker.Narrator, text: `[Narrator] ${council.ending}` })

const scriptLandscape: ScriptWithTitle = {
    title: council.title,
    segments: landscapeSegments,
    compositions: [Compositions.DebateLandscape],
}

const scriptPortrait: ScriptWithTitle[] = topicsScripted.map((topicScript, index) => ({
    title: `[${index + 1}] ${council.title}`,
    segments: topicScript,
    compositions: [Compositions.DebatePortrait],
}));

const scripts: ScriptWithTitle[] = [...scriptPortrait, scriptLandscape];

for (const script of scripts) {
    console.log(`Saving script: ${script.title}`);
    const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

    const audio = await synthesizeSpeech(script.segments);
    script.audio = [{ src: audio.audioFileName, duration: audio.duration }];

    const thumbnails = await generateThumbnails(
        script.compositions?.includes(Compositions.DebatePortrait) ? sanitizeText(script.segments[0].text) : script.title,
        script.compositions!, 
        CHANNELS
    )

    const settings = script.compositions?.includes(Compositions.DebateLandscape)
        ? { winner: council.winner }
        : undefined

    await scriptManagerClient.saveScript({
        script,
        formats: script.compositions,
        settings,
        channels: CHANNELS,
        thumbnailsSrc: thumbnails,
        scriptSrc: path.basename(scriptTextFile)
    });

    cleanupFiles([
        ...script.audio!.map(a => path.join(publicDir, a.src)),
        ...thumbnails.map(t => path.join(outputDir, t)),
        scriptTextFile
    ])
}

const uniqueImages = Array.from(new Set(positions.map(p => p.illustration)));
cleanupFiles(uniqueImages.map(img => path.join(publicDir, img)));