export interface ImageGeneratorClient {
    generate(prompt: string, id?: string | number): Promise<{ mediaSrc?: string }>
    generateThumbnail(videoTitle: string, orientation: 'Portrait' | 'Landscape'): Promise<{ mediaSrc?: string }>
}