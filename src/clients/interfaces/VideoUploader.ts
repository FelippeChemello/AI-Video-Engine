import { ENV } from "../../config/env";
import { Channels } from "../../config/types";

export enum Providers {
    YOUTUBE = 'youtube',
}

export const channelProviderAuthMap: Record<Channels, Record<Providers, string | null>> = {
    [Channels.CODESTACK]: {
        [Providers.YOUTUBE]: ENV.YOUTUBE_REFRESH_TOKEN_CODESTACK
    },
    [Channels.RED_FLAG_RADAR]: {
        [Providers.YOUTUBE]: null
    },
    [Channels.ALMA_DE_TERREIRO]: {
        [Providers.YOUTUBE]: ENV.YOUTUBE_REFRESH_TOKEN_ALMA_DE_TERREIRO
    },
}

export interface VideoUploaderClient {
    uploadVideo(
        channel: Channels,
        videoFilePath: string, 
        title: string, 
        description: string, 
        thumbnailFilePath?: string,
        tags?: Array<string>,
        scheduleAt?: Date
    ): Promise<{ url: string }>;
}