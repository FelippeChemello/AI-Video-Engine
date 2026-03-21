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

    Roaster = 'Roaster',

    Priest = 'Priest',
}

enum VoiceProvider {
    ELEVENLABS = 'elevenlabs',
    OPENAI = 'openai',
    VIBEVOICE = 'vibevoice',
    GEMINI = 'gemini',
    FISH_AUDIO = 'fishaudio',
}

export const voices: { [speaker in Speaker]: { [provider in VoiceProvider]: string } } = {
    Cody: {
        [VoiceProvider.ELEVENLABS]: 'PoHUWWWMHFrA8z7Q88pu',
        [VoiceProvider.OPENAI]: 'coral - Male, Brazilian, Bright, energetic, neutral accent with playful tones and friendly curiosity. Inquisitive and slightly excitable, genuinely amazed and eager to learn about new things. Very Quick Pace, spontaneous questions with natural enthusiasm, balanced by moments of thoughtful curiosity.', 
        [VoiceProvider.VIBEVOICE]: 'Speaker 0',
        [VoiceProvider.GEMINI]: 'Puck',
        [VoiceProvider.FISH_AUDIO]: '2d8b7dcacb2345aabf25862f3f2ce2bd',
    },
    Felippe: {
        [VoiceProvider.ELEVENLABS]: '7u8qsX4HQsSHJ0f8xsQZ',
        [VoiceProvider.OPENAI]: 'ash - Male, Brazilian, Bright, energetic, young, neutral accent, sophisticated, with clear articulation. Slightly professorial, speaking with pride and confidence in his vast knowledge, yet always approachable. Clearly articulate Portuguese and technical terms authentically. Very Fast Paced.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Achird',
        [VoiceProvider.FISH_AUDIO]: '0ba1afd27db44eb2b4cb27fd331b93aa',
    },
    Narrator: {
        [VoiceProvider.ELEVENLABS]: 'CwhRBWXzGAHq8TQ4Fs17',
        [VoiceProvider.OPENAI]: 'echo - Brazilian, Calm, deep, authoritative, neutral accent with clear diction. Warm and engaging storytelling voice, conveying trust and reliability. Very fast pace with dramatic pauses for emphasis, drawing listeners into the narrative.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Zephyr',
        [VoiceProvider.FISH_AUDIO]: '0b12d715e4c741399594fccb12d4bbe2',
    },
    ChatGPT: {
        [VoiceProvider.ELEVENLABS]: 'FGY2WhTYpPnrIDTdsKH5',
        [VoiceProvider.OPENAI]: 'alloy - Brazilian, Friendly, clear, neutral accent with a modern tone. Approachable and helpful, speaking with clarity and patience. Fast pace, ensuring understanding while maintaining engagement.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Gacrux',
        [VoiceProvider.FISH_AUDIO]: 'a5b93aeddcc948c19ea04f0afe9d178c',
    },
    Claude: {
        [VoiceProvider.ELEVENLABS]: 'pNInz6obpgDQGcFmaJgB',
        [VoiceProvider.OPENAI]: 'nova - Brazilian, Calm, thoughtful, neutral accent with a soothing tone. Reflective and measured, speaking with empathy and insight. Fast pace, allowing for contemplation and understanding.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Umbriel',
        [VoiceProvider.FISH_AUDIO]: '102bccca7dc64b6b8f8494c199c5d153',
    },
    Gemini: {
        [VoiceProvider.ELEVENLABS]: 'Xb7hH8MSUJpSbSDYk0k2',
        [VoiceProvider.OPENAI]: 'ballad - Brazilian, Energetic, youthful, neutral accent with a lively tone. Enthusiastic and engaging, speaking with excitement and curiosity. Very Fast Pace, conveying a sense of adventure and discovery.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Laomedeia',
        [VoiceProvider.FISH_AUDIO]: '2cdf1421a7124b039bf3a496fd988e6c',
    },
    Grok: {
        [VoiceProvider.ELEVENLABS]: 'pqHfZKP75CvOlQylNhV4',
        [VoiceProvider.OPENAI]: 'sage - Brazilian, Deep, wise, neutral accent with a resonant tone. Authoritative and knowledgeable, speaking with confidence and clarity. Fast pace, delivering insights with precision and depth.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Aoede',
        [VoiceProvider.FISH_AUDIO]: 'd65c6d85022b46458b9d2347769c0766',
    },
    Roaster: {
        [VoiceProvider.ELEVENLABS]: 'k3zGUviRBlOalyiswEdo',
        [VoiceProvider.OPENAI]: 'alloy - American, Mid-range vocal register with slight vocal fry. Cynical and unimpressed but witty and playful. Conversational and sarcastic, like texting a best friend. Fast-paced and snappy with strategic pauses before punchlines. Emphasis on key words for comedic impact. Natural speaking voice, never announcer-y or performed.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Umbriel',
        [VoiceProvider.FISH_AUDIO]: 'f10700a1a6fb400880df70b9d176ccb2',
    }, 
    Priest: {
        [VoiceProvider.ELEVENLABS]: 'liAlPCvGDJ0qsfPupueo',
        [VoiceProvider.OPENAI]: 'echo - Brazilian, Calm, deep, authoritative, neutral accent with clear diction. Warm and engaging storytelling voice, conveying trust and reliability. Very fast pace with dramatic pauses for emphasis, drawing listeners into the narrative.',
        [VoiceProvider.VIBEVOICE]: 'Speaker 1',
        [VoiceProvider.GEMINI]: 'Zephyr',
        [VoiceProvider.FISH_AUDIO]: '0b12d715e4c741399594fccb12d4bbe2',
    }
}

export interface TTSClient {
    synthesize(voice: Speaker, text: string, id?: string | number, customPrompt?: string): Promise<SynthesizedAudio>;
    synthesizeScript(script: Script, id?: string | number): Promise<SynthesizedAudio>;
}