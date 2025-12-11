import { Orientation } from "../../config/types";

export type Config = { [key: string]: any } | undefined;

export interface ImageGeneratorClient {
    generate(prompt: string, id?: string | number, config?: Config): Promise<{ mediaSrc?: string }>
    generateThumbnail(videoTitle: string, orientation: Orientation): Promise<{ mediaSrc?: string }>
}