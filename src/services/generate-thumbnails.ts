import { ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { OpenAIClient } from "../clients/openai";

const openai: ImageGeneratorClient = new OpenAIClient();

export async function generateThumbnails(title: string, formats: Array<'Portrait' | 'Landscape'>): Promise<Array<string>> {
    const thumbnails = await Promise.all(
        formats.map(async (format) => {
            console.log(`Generating ${format} thumbnail...`);
            const { mediaSrc: thumbnailSrc } = await openai.generateThumbnail(title, format)

            return thumbnailSrc;
        })
    );

    return thumbnails.filter(Boolean) as Array<string>;
}
