export interface AudioEditorClient {
    speedUpAudio(audioPath: string, speedFactor: number): Promise<string>;
}