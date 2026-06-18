export type Metric = { 
    id?: string,
    title: string, 
    views: number, 
    likes: number, 
    comments: number, 
    shares: number,
    duration?: number,
    publishedAt?: string,
    url?: string,
}

export interface SocialMediaClient {
    getMetrics(handle: string): Promise<Array<Metric>>
}
