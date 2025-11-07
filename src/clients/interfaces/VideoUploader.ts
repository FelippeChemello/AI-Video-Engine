export interface VideoUploaderClient {
    uploadVideo(
        videoFilePath: string, 
        title: string, 
        description: string, 
        thumbnailFilePath?: string,
        tags?: Array<string>
    ): Promise<{ url: string }>;
}