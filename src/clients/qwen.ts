import fs from 'fs';
import { v4 } from 'uuid';

import { ENV } from "../config/env";
import { Script } from '../config/types';
import { getAudioDurationInSeconds } from "get-audio-duration";
import { Speaker, TTSClient, voices as voicesMap } from './interfaces/TTS';
import path from 'path';
import { publicDir } from '../config/path';
import { sanitizeText } from '../utils/sanitize-text';

export class QwenClient implements TTSClient {
    async synthesize(voice: Speaker, text: string, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        throw new Error("Method not implemented.");
    }

    async synthesizeScript(script: Script, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        console.log(`[QWEN] Synthesizing script with ${script.length} segments`);

        const response = await fetch(`${ENV.QWEN_TTS_BASE_URL}`, {
            method: 'POST',
            headers: {
                'x-api-key': ENV.QWEN_TTS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                synthesize: script.map(segment => ({
                    text: sanitizeText(segment.text),
                    voice: voicesMap[segment.speaker].qwen_tts
                })),
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error(`[QWEN] Error response: ${responseText}`);
            throw new Error(`Failed to synthesize speech: ${response.status} ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioFileName = `audio-${id ?? v4()}.wav`;
        const outputFilePath = path.join(publicDir, audioFileName);
        fs.writeFileSync(outputFilePath, Buffer.from(audioBuffer));

        const durationInSeconds = await getAudioDurationInSeconds(outputFilePath);

        console.log(`[QWEN] Script synthesized successfully: ${outputFilePath} (Total Duration: ${durationInSeconds.toFixed(2)} seconds)`);

        return { audioFileName, duration: durationInSeconds };
    }
}