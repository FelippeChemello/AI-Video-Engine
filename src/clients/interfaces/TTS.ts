import { Script } from "../../config/types";

export type SynthesizedAudio = {
    audioFileName: string;
    duration?: number;
}

export enum Speaker {
    Cody = 'Cody',
    Felippe = 'Felippe',

    Narrator = 'Narrator',
    ChatGPT = 'ChatGPT',
    Grok = 'Grok',
    Claude = 'Claude',
    Gemini = 'Gemini',
}

enum VoiceProvider {
    ELEVENLABS = 'elevenlabs',
    OPENAI = 'openai',
    VIBEVOICE = 'vibevoice',
    GEMINI = 'gemini',
}

export const voices: { [speaker in Speaker]: { [provider in VoiceProvider]: string } } = {
    Cody: {
        [VoiceProvider.ELEVENLABS]: 'PoHUWWWMHFrA8z7Q88pu',
        [VoiceProvider.OPENAI]: 'coral - Brazilian, Bright, energetic, neutral accent with playful tones and friendly curiosity. Inquisitive and slightly excitable, genuinely amazed and eager to learn about new things. Very Quick Pace, spontaneous questions with natural enthusiasm, balanced by moments of thoughtful curiosity.', 
        [VoiceProvider.VIBEVOICE]: 'Speaker 0',
        [VoiceProvider.GEMINI]: 'Puck',
    },
    Felippe: {
        [VoiceProvider.ELEVENLABS]: '7u8qsX4HQsSHJ0f8xsQZ',
        [VoiceProvider.OPENAI]: 'ash - Brazilian, Bright, energetic, young, neutral accent, sophisticated, with clear articulation. Slightly professorial, speaking with pride and confidence in his vast knowledge, yet always approachable. Clearly articulate Portuguese and technical terms authentically. Very Fast Paced.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Achird',
    },
    Narrator: {
        [VoiceProvider.ELEVENLABS]: 'CwhRBWXzGAHq8TQ4Fs17',
        [VoiceProvider.OPENAI]: 'echo - Brazilian, Calm, deep, authoritative, neutral accent with clear diction. Warm and engaging storytelling voice, conveying trust and reliability. Very fast pace with dramatic pauses for emphasis, drawing listeners into the narrative.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Zephyr',
    },
    ChatGPT: {
        [VoiceProvider.ELEVENLABS]: 'FGY2WhTYpPnrIDTdsKH5',
        [VoiceProvider.OPENAI]: 'alloy - Brazilian, Friendly, clear, neutral accent with a modern tone. Approachable and helpful, speaking with clarity and patience. Fast pace, ensuring understanding while maintaining engagement.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Gacrux',
    },
    Claude: {
        [VoiceProvider.ELEVENLABS]: 'pNInz6obpgDQGcFmaJgB',
        [VoiceProvider.OPENAI]: 'nova - Brazilian, Calm, thoughtful, neutral accent with a soothing tone. Reflective and measured, speaking with empathy and insight. Fast pace, allowing for contemplation and understanding.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Umbriel',
    },
    Gemini: {
        [VoiceProvider.ELEVENLABS]: 'Xb7hH8MSUJpSbSDYk0k2',
        [VoiceProvider.OPENAI]: 'ballad - Brazilian, Energetic, youthful, neutral accent with a lively tone. Enthusiastic and engaging, speaking with excitement and curiosity. Very Fast Pace, conveying a sense of adventure and discovery.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Laomedeia',
    },
    Grok: {
        [VoiceProvider.ELEVENLABS]: 'pqHfZKP75CvOlQylNhV4',
        [VoiceProvider.OPENAI]: 'sage - Brazilian, Deep, wise, neutral accent with a resonant tone. Authoritative and knowledgeable, speaking with confidence and clarity. Fast pace, delivering insights with precision and depth.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Aoede',
    },
}

export interface TTSClient {
    synthesize(voice: Speaker, text: string, id?: string | number): Promise<SynthesizedAudio>;
    synthesizeScript(script: Script, id?: string | number): Promise<SynthesizedAudio>;
}