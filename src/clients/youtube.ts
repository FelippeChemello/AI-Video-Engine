import fs from 'fs';
import { google } from 'googleapis';
import { ENV } from '../config/env';
import { channelProviderAuthMap, VideoUploaderClient } from './interfaces/VideoUploader';
import { Channels } from '../config/types';

export class Youtube implements VideoUploaderClient {
    private auth = new google.auth.OAuth2(
        ENV.GOOGLE_CLIENT_ID,
        ENV.GOOGLE_CLIENT_SECRET,
    )
    
    private async authenticate(refreshToken: string) {
        this.auth.setCredentials({
            refresh_token: refreshToken,
        })

        const token = await this.auth.refreshAccessToken()

        this.auth.setCredentials(token.credentials)
    }

    async uploadVideo(
        channel: Channels,
        videoFilePath: string, 
        title: string, 
        description: string, 
        thumbnailFilePath?: string,
        tags?: Array<string>,
        scheduledPublishTime?: Date,
    ): Promise<{ url: string }> {
        const auth = channelProviderAuthMap[channel]?.youtube;
        if (!auth) {
            throw new Error(`No YouTube authentication configured for channel: ${channel}`);
        }
    
        console.log('[YOUTUBE] Authenticating with YouTube API')
        await this.authenticate(auth)

        const youtube = google.youtube({ version: 'v3', auth: this.auth });

        console.log('[YOUTUBE] Uploading video to YouTube')
        const res = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title,
                    description,
                    tags,
                    categoryId: '28' // Science & Technology
                },
                status: {
                    privacyStatus: scheduledPublishTime ? 'private' : 'public',
                    publishAt: scheduledPublishTime ? scheduledPublishTime.toISOString() : undefined,
                    madeForKids: false,
                    selfDeclaredMadeForKids: false,
                },
            },
            media: {
                body: fs.createReadStream(videoFilePath),
            },
        });

        const videoId = res.data.id;
        if (!videoId) {
            throw new Error('Failed to upload video to YouTube');
        }

        if (thumbnailFilePath) {
            console.log('[YOUTUBE] Uploading thumbnail to YouTube')
            await youtube.thumbnails.set({
                videoId,
                media: {
                    body: fs.createReadStream(thumbnailFilePath),
                },
            });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[YOUTUBE] Video uploaded successfully: ${videoUrl}`);

        return { url: videoUrl };
    }
}
