import { Orientation } from "../../config/types";

export type Config = { [key: string]: any } | undefined;

export type GenerationParams = {
    prompt: string;
    id?: string | number;
    config?: Config;
    baseImageSrc?: string;
};

export type ThumbnailParams = {
    videoTitle: string;
    orientation: Orientation;
    customImage?: {
        prompt: string;
        src: string;
    },
    thumbnailTextLanguage?: string;
}

export interface ImageGeneratorClient {
    generate(params: GenerationParams): Promise<{ mediaSrc?: string }>
    generateThumbnail(params: ThumbnailParams): Promise<{ mediaSrc?: string }>
}