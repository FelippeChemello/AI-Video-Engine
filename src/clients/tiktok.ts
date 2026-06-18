import ytdlp from 'yt-dlp-exec'
import { Metric, SocialMediaClient } from "./interfaces/SocialMedia";

export interface Entry {
    id: string
    formats: null
    subtitles: null
    http_headers: {
        Referer: string
    }
    channel: string
    channel_id: string
    uploader: string
    uploader_id: string
    channel_url: string
    uploader_url: string
    track: string
    artists: string[]
    duration: number
    title: string
    description: string
    timestamp: number
    view_count: number
    like_count: number
    repost_count: number
    comment_count: number
    thumbnails: Array<{
        id: string
        url: string
        preference: number
    }>
    ie_key: string
    _type: string
    url: string
    __x_forwarded_for_ip: null
}

export class TiktokClient implements SocialMediaClient {
    async getMetrics(handle: string): Promise<Array<Metric>> {
        const raw = await ytdlp(`https://www.tiktok.com/@${handle}`, {
            dumpSingleJson: true,
            noWarnings: true,
            skipDownload: true,
            flatPlaylist: true
        }) as unknown as { entries: Array<Entry> }

        return raw.entries.map(e => ({ 
            title: e.title,
            views: e.view_count,
            likes: e.like_count,
            comments: e.comment_count,
            shares: e.repost_count,
            duration: e.duration,
        }))
    }
}