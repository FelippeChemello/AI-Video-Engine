import { ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { OpenAIClient } from "../clients/openai";
import { compositionOrientationMap, Compositions } from "../config/types";

const openai: ImageGeneratorClient = new OpenAIClient();

export async function generateThumbnails(title: string, compositions: Array<Compositions>): Promise<Array<string>> {
    const thumbnails = await Promise.all(
        compositions.map(async (comp) => {
            const format = compositionOrientationMap[comp];

            console.log(`Generating ${format} thumbnail...`);
            const { mediaSrc: thumbnailSrc } = await openai.generateThumbnail({
                orientation: format,
                videoTitle: title,
            })

            return thumbnailSrc;
        })
    );

    return thumbnails.filter(Boolean) as Array<string>;
}
