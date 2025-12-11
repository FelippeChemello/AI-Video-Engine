import fs from 'fs';
import { v4 } from 'uuid';

import { ENV } from "../config/env";
import { Script } from '../config/types';
import { getAudioDurationInSeconds } from "get-audio-duration";
import { Speaker, TTSClient, voices as voicesMap } from './interfaces/TTS';
import path from 'path';
import { publicDir } from '../config/path';

export class VibeVoiceClient implements TTSClient {
    async synthesize(voice: Speaker, text: string, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        throw new Error("Method not implemented.");
    }

    async synthesizeScript(script: Script, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        console.log(`[VIBEVOICE] Synthesizing script with ${script.length} segments`);
        
        const text = script.map(line => `${voicesMap[line.speaker].vibevoice}: ${line.text}`).join('\n');
        const voices = ['Cody', 'Felippe'];

        const response = await fetch(`${ENV.VIBEVOICE_BASE_URL}`, {
            method: 'POST',
            headers: {
                'x-api-key': ENV.VIBEVOICE_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voices,
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error(`[VIBEVOICE] Error response: ${responseText}`);
            throw new Error(`Failed to synthesize speech: ${response.status} ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioFileName = `vibevoice-${id ?? v4()}.wav`;
        const outputFilePath = path.join(publicDir, audioFileName);
        fs.writeFileSync(outputFilePath, Buffer.from(audioBuffer));

        const durationInSeconds = await getAudioDurationInSeconds(outputFilePath);

        console.log(`[VIBEVOICE] Script synthesized successfully: ${outputFilePath} (Total Duration: ${durationInSeconds.toFixed(2)} seconds)`);

        return { audioFileName, duration: durationInSeconds };
    }
}