import path from "path";
import { Channels, Orientation } from "../../config/types";
import { publicDir } from "../../config/path";

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

export const channelThumbnailConfig: { [key in Channels]: null | { prompter: (videoTitle: string) => string, imageBaseSrc: string } } = {
    [Channels.CODESTACK]: {
        prompter: (videoTitle: string) => `A imagem de referência é uma ilustração de Felippe, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}".`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'felippe.png'),
    },
    [Channels.RED_FLAG_RADAR]: null,
    [Channels.ALMA_DE_TERREIRO]: {
        prompter: (videoTitle: string) => `A imagem de referência é de um umbandista, use-a como base para criar a thumbnail. \n\n Gere uma thumbnail para o vídeo sobre o seguinte assunto "${videoTitle}".`,
        imageBaseSrc: path.resolve(publicDir, 'assets', 'umbandista.png'),
    }
}

export interface ImageGeneratorClient {
    generate(params: GenerationParams): Promise<{ mediaSrc?: string }>
    generateThumbnail(params: ThumbnailParams): Promise<{ mediaSrc?: string }>
}