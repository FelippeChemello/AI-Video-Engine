import { CodexClient } from "../clients/codex";
import { GeminiClient } from "../clients/gemini";
import {
    channelThumbnailConfig,
    ImageGeneratorClient,
    ThumbnailParams,
} from "../clients/interfaces/ImageGenerator";
import { OpenAIClient } from "../clients/openai";
import {
    Channels,
    compositionOrientationMap,
    Compositions,
} from "../config/types";

const codex: ImageGeneratorClient = new CodexClient();
const gemini: ImageGeneratorClient = new GeminiClient();
const openai: ImageGeneratorClient = new OpenAIClient();

type ThumbnailRequest = {
    videoTitle: string;
    compositions: Array<Compositions>;
    channels: Array<Channels>;
    customImage?: {
        prompt: string;
        src: string;
    };
    engines?: Array<ImageGeneratorClient>;
    textLanguage?: 'ENGLISH' | 'PORTUGUESE';
};

export async function generateThumbnails({
    videoTitle: title,
    compositions,
    channels,
    customImage,
    textLanguage = 'PORTUGUESE',
    engines = [codex, openai, gemini],
}: ThumbnailRequest): Promise<Array<string>> {
    const thumbnails: Array<string | undefined> = [];

    for (const composition of compositions) {
        for (const channel of channels) {
            const { prompter, imageBaseSrc } = customImage
                ? { prompter: () => customImage.prompt, imageBaseSrc: customImage.src }
                : channelThumbnailConfig[channel] || {};

            const prompt = prompter ? prompter(title) : undefined;
            const options: ThumbnailParams = {
                videoTitle: title,
                orientation: compositionOrientationMap[composition],
                thumbnailTextLanguage: textLanguage,
                customImage:
                    imageBaseSrc && prompt
                        ? {
                              prompt,
                              src: imageBaseSrc,
                          }
                        : undefined,
            };

            let thumbnail: string | undefined;
            for (const engine of engines) {
                try {
                    const result = await engine.generateThumbnail(options);
                    if (result.mediaSrc) {
                        thumbnail = result.mediaSrc;
                        console.log(
                            `Thumbnail generated successfully with ${engine.constructor.name} for composition ${composition} and channel ${channel}`,
                        );
                        break;
                    }
                } catch (error) {
                    console.error(
                        `Error generating thumbnail with ${engine.constructor.name} for composition ${composition} and channel ${channel}:`,
                        error,
                    );
                }
            }

            thumbnails.push(thumbnail);
        }
    }


    return thumbnails.filter(Boolean) as Array<string>;
}
