import fs from 'fs';
import path from 'path';

import { outputDir } from './config/path';
import { AudioScript, Compositions, Script, ScriptWithTitle } from './config/types';
import { ImageGeneratorClient } from './clients/interfaces/ImageGenerator';
import { Agent, LLMClient } from "./clients/interfaces/LLM";
import { OpenAIClient } from "./clients/openai";
import { AnthropicClient } from "./clients/anthropic";
import { GeminiClient } from "./clients/gemini";
import { Speaker, SynthesizedAudio, TTSClient } from './clients/interfaces/TTS';
import { GrokClient } from './clients/grok';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';

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
        openai.complete(Agent.DEBATE, `Tópico: ${topic}`).then(res => JSON.parse(res.text)).catch(() => ({ position: "O modelo da OpenAI recusou-se a responder." })),
        anthropic.complete(Agent.DEBATE, `Tópico: ${topic}`).then(res => JSON.parse(res.text)).catch(() => ({ position: "O modelo da Anthropic recusou-se a responder." })),
        gemini.complete(Agent.DEBATE, `Tópico: ${topic}`).then(res => JSON.parse(res.text)).catch(() => ({ position: "O modelo da Gemini recusou-se a responder." })),
        grok.complete(Agent.DEBATE, `Tópico: ${topic}`).then(res => JSON.parse(res.text)).catch(() => ({ position: "O modelo da Grok recusou-se a responder." })),
        openai.generate(`Uma ilustração detalhada que represente um debate sobre o tópico: "${topic}" - A imagem não deve conter background`, `${topicIndex}-illustration`, { background: 'transparent' }),
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

const council = await anthropic.complete(Agent.DEBATE_COUNCIL, positions.map(p => `Tópico: ${p.topic} \n\n [OpenAI]: ${p.openai} \n\n [Anthropic]: ${p.anthropic} \n\n [Gemini]: ${p.gemini} \n\n [Grok]: ${p.grok}`).join('\n\n---\n\n')).then(res => JSON.parse(res.text));

const topicsScripted: Script[] = positions.map(p => ([
    { speaker: Speaker.Narrator, text: `[Narrator] ${p.topic}`, mediaSrc: p.illustration },
    { speaker: Speaker.ChatGPT, text: `[ChatGPT] ${p.openai}`, mediaSrc: p.illustration },
    { speaker: Speaker.Grok, text: `[Grok] ${p.grok}`, mediaSrc: p.illustration },
    { speaker: Speaker.Claude, text: `[Claude] ${p.anthropic}`, mediaSrc: p.illustration },
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

fs.writeFileSync(path.join(outputDir, 'script-debate.json'), JSON.stringify(scripts, null, 2));

for (const script of scripts) {
    console.log(`Saving script: ${script.title}`);

    const removeSpeakerTagRegex = /^\[\w+\]\s*/gi;
    const audios: Array<AudioScript> = []
    
    for (const segmentIndex in script.segments) {
        const segment = script.segments[segmentIndex];
        const sanitizedText = segment.text.replace(removeSpeakerTagRegex, '');

        console.log(`Synthesizing ${segment.speaker} voice`)
        const tts: SynthesizedAudio = await openai.synthesize(segment.speaker, sanitizedText, segmentIndex);

        audios.push({ src: tts.audioFileName, duration: tts.duration })
    }

    script.audio = audios;

    const settings = script.compositions?.includes(Compositions.DebateLandscape)
        ? { winner: council.winner }
        : undefined

    await scriptManagerClient.saveScript({
        script,
        formats: script.compositions,
        settings
    });
}