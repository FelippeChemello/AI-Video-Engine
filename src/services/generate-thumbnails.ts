import { GeminiClient } from "../clients/gemini";
import { channelThumbnailConfig, ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { Channels, compositionOrientationMap, Compositions } from "../config/types";

const gemini: ImageGeneratorClient = new GeminiClient();

export async function generateThumbnails(title: string, compositions: Array<Compositions>, channels: Array<Channels>): Promise<Array<string>> {
    const thumbnailsPromises = []

    for (const composition of compositions) {
        for (const channel of channels) {
            const { prompter, imageBaseSrc } = channelThumbnailConfig[channel] || {};

            const prompt = prompter ? prompter(title) : undefined;

            thumbnailsPromises.push(
                gemini.generateThumbnail({
                    videoTitle: title,
                    orientation: compositionOrientationMap[composition],
                    customImage: imageBaseSrc && prompt ? {
                        prompt,
                        src: imageBaseSrc,
                    } : undefined,
                })
                .then(({ mediaSrc }) => mediaSrc)
                .catch((err) => {
                    console.error(`Error generating thumbnail for composition ${composition} and channel ${channel}:`, err);
                    return null; 
                })
            )
        }
    }

    const thumbnails = await Promise.all(thumbnailsPromises);

    return thumbnails.filter(Boolean) as Array<string>;
}
