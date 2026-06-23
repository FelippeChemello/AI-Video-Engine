import fs from 'fs';
import { google, youtube_v3 } from 'googleapis';
import { ENV } from '../config/env';
import { channelProviderAuthMap, VideoUploaderClient } from './interfaces/VideoUploader';
import { Channels } from '../config/types';
import { Metric, SocialMediaClient } from './interfaces/SocialMedia';

const YOUTUBE_METRICS_LIMIT = 50;
const YOUTUBE_VIDEOS_PAGE_SIZE = 50;
const SHORTS_MAX_DURATION_SECONDS = 180;

export class Youtube implements VideoUploaderClient, SocialMediaClient {
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

    async getMetrics(handle: string): Promise<Array<Metric>> {
        console.log(`[YOUTUBE] Fetching metrics for handle: ${handle}`);

        await this.authenticate(ENV.YOUTUBE_REFRESH_TOKEN_CODESTACK);

        const youtube = google.youtube({ version: 'v3', auth: this.auth });
        const uploadsPlaylistId = await this.getUploadsPlaylistId(youtube, handle);
        const videos = await this.getLatestUploadedVideos(youtube, uploadsPlaylistId, YOUTUBE_METRICS_LIMIT);

        console.log(`[YOUTUBE] Fetched ${videos.length} videos for handle: ${handle}`);

        return videos.map(video => ({
            id: video.id ?? undefined,
            title: video.snippet?.title ?? '',
            views: this.parseCount(video.statistics?.viewCount),
            likes: this.parseCount(video.statistics?.likeCount),
            comments: this.parseCount(video.statistics?.commentCount),
            shares: 0,
            duration: this.parseDuration(video.contentDetails?.duration),
            publishedAt: video.snippet?.publishedAt ?? undefined,
            url: video.id ? `https://www.youtube.com/watch?v=${video.id}` : undefined,
        }));
    }

    private async getUploadsPlaylistId(youtube: youtube_v3.Youtube, handle: string): Promise<string> {
        const channelLookup = this.getChannelLookup(handle);
        const res = await youtube.channels.list({
            part: ['contentDetails'],
            maxResults: 1,
            ...channelLookup,
        });

        const uploadsPlaylistId = res.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) {
            throw new Error(`Could not find YouTube uploads playlist for handle: ${handle}`);
        }

        return uploadsPlaylistId;
    }

    private async getLatestUploadedVideos(
        youtube: youtube_v3.Youtube,
        uploadsPlaylistId: string,
        limit: number,
    ): Promise<Array<youtube_v3.Schema$Video>> {
        const videos: Array<youtube_v3.Schema$Video> = [];
        let pageToken: string | undefined;

        while (videos.length < limit) {
            const playlistRes = await youtube.playlistItems.list({
                part: ['contentDetails'],
                maxResults: YOUTUBE_VIDEOS_PAGE_SIZE,
                pageToken,
                playlistId: uploadsPlaylistId,
            });

            const videoIds = playlistRes.data.items
                ?.map(item => item.contentDetails?.videoId)
                .filter((id): id is string => Boolean(id)) ?? [];

            if (videoIds.length === 0) {
                break;
            }

            const videosRes = await youtube.videos.list({
                part: ['contentDetails', 'snippet', 'statistics'],
                id: videoIds,
            });

            const videoOrder = new Map(videoIds.map((id, index) => [id, index]));
            const sortedVideos = (videosRes.data.items ?? [])
                .sort((first, second) => {
                    const firstIndex = videoOrder.get(first.id ?? '') ?? Number.MAX_SAFE_INTEGER;
                    const secondIndex = videoOrder.get(second.id ?? '') ?? Number.MAX_SAFE_INTEGER;

                    return firstIndex - secondIndex;
                });

            videos.push(...sortedVideos.filter(video => !this.isShort(video)));
            pageToken = playlistRes.data.nextPageToken ?? undefined;

            if (!pageToken) {
                break;
            }
        }

        return videos.slice(0, limit);
    }

    private getChannelLookup(handle: string): Pick<youtube_v3.Params$Resource$Channels$List, 'forHandle' | 'forUsername' | 'id'> {
        const normalized = handle.trim();

        if (normalized.startsWith('https://') || normalized.startsWith('http://')) {
            const url = new URL(normalized);
            const parts = url.pathname.split('/').filter(Boolean);
            const [type, value] = parts;

            if (type === 'channel' && value) {
                return { id: [value] };
            }

            if (type === 'user' && value) {
                return { forUsername: value };
            }

            if (type?.startsWith('@')) {
                return { forHandle: type.replace(/^@/, '') };
            }
        }

        return { forHandle: normalized.replace(/^@/, '') };
    }

    private isShort(video: youtube_v3.Schema$Video): boolean {
        const duration = this.parseDuration(video.contentDetails?.duration);
        return duration !== undefined && duration <= SHORTS_MAX_DURATION_SECONDS;
    }

    private parseDuration(duration?: string | null): number | undefined {
        if (!duration) {
            return undefined;
        }

        const match = duration.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
        if (!match) {
            return undefined;
        }

        const [, days = '0', hours = '0', minutes = '0', seconds = '0'] = match;
        return Number(days) * 86400 + Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    }

    private parseCount(count?: string | null): number {
        return count ? Number(count) : 0;
    }
}
