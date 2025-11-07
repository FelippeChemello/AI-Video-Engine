import ffmpeg from 'fluent-ffmpeg';

import { VideoEditorClient } from './interfaces/VideoEditor'
import { AudioEditorClient } from './interfaces/AudioEditor';

export class FFmpegClient implements VideoEditorClient, AudioEditorClient {
    async speedUpVideo(videoPath: string, speedFactor: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const outputPath = videoPath.replace(/(\.\w+)$/, `-SpeedUp$1`);
    
            ffmpeg(videoPath)
                .videoFilters(`setpts=${1 / speedFactor}*PTS`)
                .audioFilters(`atempo=${speedFactor}`)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }

    async speedUpAudio(audioPath: string, speedFactor: number): Promise<string> {
        return new Promise((resolve, reject) => {
            const outputPath = audioPath.replace(/(\.\w+)$/, `-SpeedUp$1`);
    
            ffmpeg(audioPath)
                .audioFilters(`atempo=${speedFactor}`)
                .output(outputPath)
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .run();
        });
    }
}