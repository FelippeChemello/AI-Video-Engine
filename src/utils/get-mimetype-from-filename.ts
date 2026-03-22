export function getMimetypeFromFilename(filename: string): { mimeType: string; extension: string, type: 'audio' | 'video' | 'image' | 'document' } {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) {
        throw new Error(`Filename "${filename}" does not have an extension`);
    }

    const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        mp4: 'video/mp4',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webm: 'video/webm',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        avif: 'image/avif',
        txt: 'text/plain',
        pdf: 'application/pdf',
    };

    const mimeType = mimeTypes[extension];
    if (!mimeType) {
        throw new Error(`Unsupported file type: ${extension}`);
    }

    const type: 'audio' | 'video' | 'image' | 'document' = mimeType.startsWith('audio/') 
        ? 'audio' 
        : mimeType.startsWith('video/') 
            ? 'video' 
            : mimeType.startsWith('image/') 
                ? 'image' 
                : 'document';

    return { mimeType, extension, type };
}