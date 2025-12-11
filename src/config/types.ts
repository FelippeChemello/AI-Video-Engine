import { zColor } from "@remotion/zod-types";
import { z } from "zod";
import { Speaker } from "../clients/interfaces/TTS";

export enum Compositions {
    // Dialogue
    Portrait = 'Portrait',
    Landscape = 'Landscape',

    // Debate
    DebatePortrait = 'DebatePortrait',
    DebateLandscape = 'DebateLandscape',
}

export enum Orientation {
    PORTRAIT = 'Portrait',
    LANDSCAPE = 'Landscape',
}

export const compositionOrientationMap: { [key in Compositions]: Orientation } = {
    [Compositions.Portrait]: Orientation.PORTRAIT,
    [Compositions.Landscape]: Orientation.LANDSCAPE,
    [Compositions.DebatePortrait]: Orientation.PORTRAIT,
    [Compositions.DebateLandscape]: Orientation.LANDSCAPE,
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
    Settings: {
      id: string;
      type: 'rich_text';
      rich_text: Array<{ text: { content: string } }>;
    },
  }
}

export type VideoBackground = {
    video?: {
      src: string;
      initTime?: number;
    };
    color?: string;
    mainColor?: string;
    secondaryColor?: string;
    seed?: string | number;
};

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
    visemes?: Array<{
        start: number;
        end: number;
        viseme: string;
    }>;
}

export type ScriptWithTitle = {
    title: string;
    segments: Script;
} & {
    id?: string;
    audio?: Array<AudioScript>;
    compositions?: Array<Compositions>;
    background?: VideoBackground;
    seo?: string;
    settings?: any;
    thumbnails?: Array<{ filename: string; src: string }>;
}

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

export type AudioToVisemeResponse = {
    visemes?: Array<{
        start: number;
        end: number;
        viseme: string;
    }>;
}

export type Viseme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | undefined

export const videoSchema = z.object({
  background: z.object({
    video: z.object({
      src: z.string(),
      initTime: z.number().optional(),
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
    visemes: z.array(z.object({
      start: z.number(),
      end: z.number(),
      viseme: z.string(),
    })).optional(),
  })),
  settings: z.any().optional(),
});