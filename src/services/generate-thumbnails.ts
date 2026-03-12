import { GeminiClient } from "../clients/gemini";
import { ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { compositionOrientationMap, Compositions } from "../config/types";

const gemini: ImageGeneratorClient = new GeminiClient();

export async function generateThumbnails(title: string, compositions: Array<Compositions>): Promise<Array<string>> {
    const thumbnails = await Promise.all(
        compositions.map(async (comp) => {
            const format = compositionOrientationMap[comp];

            console.log(`Generating ${format} thumbnail...`);
            const { mediaSrc: thumbnailSrc } = await gemini.generateThumbnail({
                orientation: format,
                videoTitle: title,
            })

            return thumbnailSrc;
        })
    );

    return thumbnails.filter(Boolean) as Array<string>;
}
