import path from "path";
import { Channels, Orientation } from "../../config/types";
import { publicDir } from "../../config/path";

export enum ImageGeneratorProvider {
    OPENAI = 'openai',
    CODEX = 'codex',
    GEMINI = 'gemini',
}

export type Config = { [key: string]: any } | undefined;

export type GenerationParams = {
    prompt: string;
    id?: string | number;
    config?: Config;
    baseImageSrc?: string;
};

export type ThumbnailParams = {
    videoTitle: string;
    filename: string;
    size: {
        width: number;
        height: number;
    };
    orientation: Orientation;
    customImage?: {
        prompt: string;
        src: string;
    },
    thumbnailTextLanguage?: string;
}

export type ChannelThumbnailConfig = {
    prompter: (videoTitle: string) => string;
    imageBaseSrc: string;
    size: {
        [orientation in Orientation]: null | {
            width: number;
            height: number;
        }
    }
}

const thumbnailSize = {
    youtube: {
        [Orientation.PORTRAIT]: {
            width: 720,
            height: 1280
        },
        [Orientation.LANDSCAPE]: {
            width: 1280,
            height: 720
        }
    },
    tiktok: {
        [Orientation.PORTRAIT]: {
            width: 1080,
            height: 1350
        },
    }
}

export const channelThumbnailConfig: { [key in Channels]: null | ChannelThumbnailConfig } = {
    [Channels.CODESTACK]: {
        prompter: (videoTitle: string) => `A imagem de referência é uma ilustração de Felippe, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}". Use quantidade minima de texto`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'felippe-ref.png'),
        size: {
            [Orientation.PORTRAIT]: thumbnailSize.youtube[Orientation.PORTRAIT],
            [Orientation.LANDSCAPE]: thumbnailSize.youtube[Orientation.LANDSCAPE]
        }
    },
    [Channels.RED_FLAG_RADAR]: null,
    [Channels.ALMA_DE_TERREIRO]: {
        prompter: (videoTitle: string) => `A imagem de referência é uma ilustração de seu Firmo, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}". Use quantidade minima de texto!!!`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'umbandista-ref-merged.png'),
        size: {
            [Orientation.PORTRAIT]: thumbnailSize.youtube[Orientation.PORTRAIT],
            [Orientation.LANDSCAPE]: thumbnailSize.youtube[Orientation.LANDSCAPE]
        }
    },
    [Channels.ALMA_DE_TERREIRO_UMBANDA]: {
        prompter: (videoTitle: string) => `A imagem de referência é uma ilustração de seu Firmo, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}". Use quantidade minima de texto!!!`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'umbandista-ref-merged.png'),
        size: {
            [Orientation.PORTRAIT]: thumbnailSize.tiktok[Orientation.PORTRAIT],
            [Orientation.LANDSCAPE]: null
        }
    },
    [Channels.FELIPPE_DEV]:  {
        prompter: (videoTitle: string) => `A imagem de referência é uma ilustração de Felippe, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}". Use quantidade minima de texto`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'felippe-ref.png'),
        size: {
            [Orientation.PORTRAIT]: thumbnailSize.tiktok[Orientation.PORTRAIT],
            [Orientation.LANDSCAPE]: null
        }
    }
}

export interface ImageGeneratorClient {
    generate(params: GenerationParams): Promise<{ mediaSrc?: string }>
    generateThumbnail(params: ThumbnailParams): Promise<{ mediaSrc?: string }>
}
