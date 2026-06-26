import { ModalClient } from 'modal'
import fs from 'fs';

import { GPURunnerClient } from './interfaces/GPURunner';
import { ENV } from '../config/env';
import path from 'path';
import { outputDir } from '../config/path';
import { v4 } from 'uuid';

const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

export class Modal implements GPURunnerClient {
    private client = new ModalClient({
        tokenId: ENV.MODAL_TOKEN_ID,
        tokenSecret: ENV.MODAL_TOKEN_SECRET,
    });
    
    async generateAvatar(imagePath: string, audioPath: string): Promise<{ videoSrc: string }> {
        const cls = await this.client.cls.fromName('longcat-video-avatar', 'Model')
        const instance = await cls.instance()
        const method = instance.method('generate')

        const call = await method.spawn([
            fs.readFileSync(imagePath).toString('base64'),
            fs.readFileSync(audioPath).toString('base64')
        ])

        console.log(`[MODAL] Generating avatar video with call ID: ${call.functionCallId}`)

        const result = await this.awaitFunctionCallAndGetResult(call.functionCallId)

        const videoSrc = `avatar-${v4()}.mp4`;
        fs.writeFileSync(path.resolve(outputDir, videoSrc), result)

        return { videoSrc };
    }

    async awaitFunctionCallAndGetResult(functionCallId: string): Promise<Buffer> {
        const call = await this.client.functionCalls.fromId(functionCallId)
        const result = await call.get({ timeoutMs: TWO_HOURS_IN_MS })
        return Buffer.from(result)
    }
}