export interface GPURunnerClient {
    generateAvatar(imagePath: string, audioPath: string): Promise<{ videoSrc: string }>;
}