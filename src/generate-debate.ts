import path from 'path';

import { outputDir, publicDir } from './config/path';
import { Channels, Compositions, Script, ScriptWithTitle } from './config/types';
import { Agent, LLMProvider } from "./clients/interfaces/LLM";
import { Speaker } from './clients/interfaces/TTS';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { cleanupFiles } from './services/cleanup-files';
import { generateThumbnails } from './services/generate-thumbnails';
import { saveScriptFile } from './services/save-script-file';
import { titleToFileName } from './utils/title-to-filename';
import { synthesizeSpeech } from './services/synthesize-speech';
import { sanitizeText } from './utils/sanitize-text';
import { generateLLMResponse, LLMRequest } from './services/generate-llm-response';
import { generateIllustration } from './services/generate-illustration';

const CHANNELS = [Channels.CODESTACK]

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

for (const topic of topics) {
    console.log(`\n\nStarting generation for topic: ${topic}`);

    const llmImput: LLMRequest<Agent.DEBATE> = {
        agent: Agent.DEBATE,
        prompt: `Forneça a sua opinião concisa e direta sobre o seguinte tópico: ${topic}`,
    }

    const [
        { position: openaiOpinion },
        { position: anthropicOpinion },
        { position: geminiOpinion },
        { position: grokOpinion },
        mediaSrc
    ] = await Promise.all([
        generateLLMResponse({ ...llmImput, providers: [LLMProvider.CODEX, LLMProvider.OPENAI] }).catch(() => ({ position: "O modelo da OpenAI recusou-se a responder." })),
        generateLLMResponse({ ...llmImput, providers: [LLMProvider.ANTHROPIC] }).catch(() => ({ position: "O modelo da Anthropic recusou-se a responder." })),
        generateLLMResponse({ ...llmImput, providers: [LLMProvider.GEMINI] }).catch(() => ({ position: "O modelo da Google recusou-se a responder." })),
        generateLLMResponse({ ...llmImput, providers: [LLMProvider.GROK] }).catch(() => ({ position: "O modelo da Grok recusou-se a responder." })),
        generateIllustration({
            type: 'image_generation',
            description: `Crie uma ilustração que represente o seguinte tópico de forma criativa e visualmente atraente: ${topic} - A imagem não deve conter texto, apenas elementos visuais que capturem a essência do tema.`,
        })
    ]);

    positions.push({
        topic,
        illustration: mediaSrc || '',
        openai: openaiOpinion,
        anthropic: anthropicOpinion,
        gemini: geminiOpinion,
        grok: grokOpinion,
    });
}

const council = await generateLLMResponse({
    agent: Agent.DEBATE_COUNCIL,
    prompt: positions.map(p => `Tópico: ${p.topic} \n\n [OpenAI]: ${p.openai} \n\n [Anthropic]: ${p.anthropic} \n\n [Gemini]: ${p.gemini} \n\n [Grok]: ${p.grok}`).join('\n\n---\n\n'),
})

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

    const thumbnails = await generateThumbnails({
        videoTitle: script.compositions?.includes(Compositions.DebatePortrait) ? sanitizeText(script.segments[0].text) : script.title,
        channels: CHANNELS,
        compositions: script.compositions!,
    })

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