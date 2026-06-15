import { zColor } from "@remotion/zod-types";
import { z } from "zod";
import { Speaker } from "../clients/interfaces/TTS";

export enum Compositions {
    // Debate
    DebatePortrait = 'DebatePortrait',
    DebateLandscape = 'DebateLandscape',

    // Tinder Roast
    TinderRoast = 'TinderRoastPortrait',

    // Religious
    ReligiousPortrait = 'ReligiousPortrait',
    ReligiousLandscape = 'ReligiousLandscape',
    ReligiousPortraitVideo = 'ReligiousPortraitVideo',

    // Tech
    TechPortraitVideo = 'TechPortraitVideo',
}

export enum Orientation {
    PORTRAIT = 'Portrait',
    LANDSCAPE = 'Landscape',
}

export enum Channels {
    CODESTACK = 'CodeStack',
    RED_FLAG_RADAR = 'RedFlagRadar',
    ALMA_DE_TERREIRO = 'AlmaDeTerreiro',
}

export const compositionOrientationMap: { [key in Compositions]: Orientation } = {
    [Compositions.TechPortraitVideo]: Orientation.PORTRAIT,
    [Compositions.DebatePortrait]: Orientation.PORTRAIT,
    [Compositions.DebateLandscape]: Orientation.LANDSCAPE,
    [Compositions.TinderRoast]: Orientation.PORTRAIT,
    [Compositions.ReligiousPortrait]: Orientation.PORTRAIT,
    [Compositions.ReligiousLandscape]: Orientation.LANDSCAPE,
    [Compositions.ReligiousPortraitVideo]: Orientation.PORTRAIT,
};

export enum ScriptStatus {
    NOT_READY = 'Not ready',
    READY = 'Ready',
    NOT_STARTED = 'Not started',
    IN_PROGRESS = 'In progress',
    DONE = 'Done',
    PUBLISHED = 'Published',
    ERROR = 'Error',
}

export type NotionMainDatabasePage = {
  id: string;
  created_time: string;
  properties: {
    Audio: {
      id: string;
      type: 'file';
      files: Array<{url: string, expiry_type: string}>;
    };
    Status: {
      id: string;
      type: 'status';
      status: { id: string, name: ScriptStatus, color: string };
    };
    Name: {
      id: string;
      type: 'title';
      title: Array<{ text: { content: string } }>;
    },
    Composition: {
      id: string;
      type: 'multi_select';
      multi_select: Array<{
        id: string;
        name: Compositions;
        color: string;
      }>;
    },
    Output: {
      id: string;
      type: 'files';
      files: Array<{ name: string, type: 'file' | 'file_upload' | 'external', file: { url: string, expiry_type: string }}>;
    },
    Title: {
      id: string;
      type: 'rich_text';
      rich_text: Array<{ text: { content: string } }>;
    },
    Date: {
      id: string;
      type: 'date';
      date: { start: string };
    },
    Settings: {
      id: string;
      type: 'rich_text';
      rich_text: Array<{ text: { content: string } }>;
    },
    Channel: {
      id: string;
      type: 'multi_select';
      multi_select: Array<{
        id: string;
        name: Channels;
        color: string;
      }>;
    }
  }
}

export type VideoBackground = {
    video?: {
      src: string;
      initTime?: number;
    };
    gif?: {
      src: string;
    };
    color?: string;
    mainColor?: string;
    secondaryColor?: string;
    seed?: string | number;
};

export type TinderRoastScript = {
    meta: {
        video_title: string;
        video_description: string;
        video_hashtags: Array<string>;
        archetype_used: string;
    },
    profile: {
        name: string;
        age: number; 
        job: string;  
        location: string;
        main_photo_description: string; // Description of how the person looks like, this is the base for other photo descriptions - super detailed
        photos: string[]; // Array of photo descriptions, each describing a photo on the profile, the main_photo_description will be used as a reference
        bio: string;
    },
    script: { // Everything will be directly spoken in the video, take care to make it funny and savage without any text formatting
        video_intro: string; // Intro to the video - This will be the opening lines spoken by the reviewer while the tinder profile is being loaded on screen
        intro: string; // Introduction to the fictional profile
        photo_roasts: Array<string>; // Array of roasts for each photo in same order as the photos array
        bio_roast: Array<{
            target: string; // The specific part of the bio being roasted - Exactly as it appears in the bio
            narration: string; // The roast narration for that specific part of the bio
        }>
        decision: {
            verdict: string; // The final verdict on the profile
            swipe_direction: 'left' | 'right'; // Whether to swipe left or right
        }
    }
}

export type BasicScript = {
    id: string;
    title: string;
    status: ScriptStatus;
    compositions: Array<Compositions>;
    seo?: string;
}

export type AudioScript = {
    src: string
    mimeType?: string;
    extension?: string;
    duration?: number;
    alignment?: Array<{
        start: number;
        end: number;
        text: string;
    }>;
}

export const scriptWithTitleSchema = z.object({
    title: z.string(),
    segments: z.array(z.object({
        text: z.string(),
        speaker: z.nativeEnum(Speaker),
        illustration: z.object({
            type: z.union([z.literal('query'), z.literal('image_generation'), z.literal('mermaid'), z.literal('code')]),
            description: z.string(),
        }).optional(),
        mediaSrc: z.string().optional(),
    })),
    id: z.string().optional(),
    audio: z.array(z.object({
        src: z.string(),
        mimeType: z.string().optional(),
        extension: z.string().optional(),
        duration: z.number().optional(),
        alignment: z.array(z.object({
            start: z.number(),
            end: z.number(),
            text: z.string(),
        })).optional(),
    })).optional(),
    compositions: z.array(z.nativeEnum(Compositions)).optional(),
    background: z.object({
        video: z.object({
            src: z.string(),
            initTime: z.number().optional(),
        }).optional(),
        gif: z.object({
            src: z.string(),
        }).optional(),
        color: z.string().optional(),
        mainColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        seed: z.union([z.string(), z.number()]).optional(),
    }).optional(),
    avatarVideoSrc: z.string().optional(),
    seo: z.string().optional(),
    settings: z.any().optional(),
    thumbnails: z.array(z.object({
        filename: z.string(),
        src: z.string(),
    })).optional(),
    channels: z.array(z.nativeEnum(Channels)).optional(),
    date: z.date().optional(),
});

export type ScriptWithTitle = z.infer<typeof scriptWithTitleSchema>;

export type SEO = {
    title: string;
    description: string;
    tags: string[];
    hashtags: string[];
}

export type Script = Array<{
    text: string;
    speaker: Speaker;
    illustration?: {
      type: 'query' | 'image_generation' | 'mermaid' | 'code'
      description: string
    }
} & {
    mediaSrc?: string;
}>

export type AudioAlignerDTO = {
    audio: {
        filepath: string;
        mimeType: string;
    };
    text: string;
}

export type AeneasAlignment = { fragments: Array<{ begin: string, end: string, id: string, lines: Array<string> }> }

export type MontrealAudioAlignment = {
  start: number;
  end: number;
  tiers: {
    words: {
      type: 'interval';
      entries: Array<[number, number, string]>
    };
    phones: {
      type: 'interval';
      entries: Array<[number, number, string]>
    }
  }
}

export type AudioAlignerResponse = {
    alignment: Array<{
        start: number;
        end: number;
        text: string;
    }>;
    duration: number;
}

export const videoSchema = z.object({
  background: z.object({
    video: z.object({
      src: z.string(),
      initTime: z.number().optional(),
    }).optional(),
    gif: z.object({
      src: z.string(),
    }).optional(),
    color: zColor(),
    mainColor: zColor(),
    secondaryColor: zColor(),
    seed: z.union([z.string(), z.number()]),
  }),
  segments: z.array(z.object({
    text: z.string(),
    speaker: z.nativeEnum(Speaker),
    mediaSrc: z.string().optional(),
    duration: z.number(),
    alignment: z.array(z.object({
      start: z.number(),
      end: z.number(),
      text: z.string(),
    })),
  })),
  audio: z.array(z.object({
    src: z.string(),
    mimeType: z.string().optional(),
    extension: z.string().optional(),
    duration: z.number().optional(),
    alignment: z.array(z.object({
      start: z.number(),
      end: z.number(),
      text: z.string(),
    })).optional(),
  })),
  avatarVideoSrc: z.string().optional(),
  settings: z.any().optional(),
  title: z.string(),
});