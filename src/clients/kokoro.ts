import fs from 'fs';
import { v4 } from 'uuid';

import { ENV } from "../config/env";
import { Script, Speaker } from '../config/types';
import { getAudioDurationInSeconds } from "get-audio-duration";
import { TTSClient } from './interfaces/TTS';
import path from 'path';
import { publicDir } from '../config/path';
import { concatAudioFiles } from '../utils/concat-audio-files';

const voices: { [key in keyof typeof Speaker]: string } = {
    Cody: 'pf_dora',
    Felippe: 'pm_alex',
}

export class KokoroClient implements TTSClient {
    async synthesize(voice: Speaker, text: string, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        console.log(`[KOKORO] Synthesizing speech for voice: ${voice}`);

        const response = await fetch(`${ENV.KOKORO_BASE_URL}`, {
            method: 'POST',
            headers: {
                'x-api-key': ENV.KOKORO_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice: voices[voice],
            }),
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error(`[KOKORO] Error response: ${responseText}`);
            throw new Error(`Failed to synthesize speech: ${response.status} ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioFileName = `kokoro_${voice.toLowerCase()}_${id ?? v4()}.wav`
        const outputFilePath = path.resolve(publicDir, audioFileName);
        fs.writeFileSync(outputFilePath, Buffer.from(audioBuffer));

        const durationInSeconds = await getAudioDurationInSeconds(outputFilePath);

        console.log(`[KOKORO] Speech synthesized successfully: ${audioFileName} (Duration: ${durationInSeconds.toFixed(2)} seconds)`);

        return { audioFileName, duration: durationInSeconds };
    }

    async synthesizeScript(script: Script, id?: string | number): Promise<{ audioFileName: string; duration?: number; }> {
        console.log(`[KOKORO] Synthesizing script with ${script.length} segments`);
        
        const dialog: Array<{ audioFileName: string; duration?: number; }> = [];
        for (const line of script) {
            const synthesizedLine = await this.synthesize(line.speaker, line.text);
            dialog.push(synthesizedLine);
        }

        const audioFileName = `kokoro-${id ?? v4()}.wav`;
        const outputFilePath = path.join(publicDir, audioFileName);
            
        await concatAudioFiles(dialog.map(d => path.join(publicDir, d.audioFileName)), outputFilePath);

        console.log(`[KOKORO] Removing temporary segment files`);
        for (const segment of dialog) {
            const segmentPath = path.join(publicDir, segment.audioFileName);
            fs.unlinkSync(segmentPath);
        }

        const totalDuration = await getAudioDurationInSeconds(outputFilePath);

        console.log(`[KOKORO] Script synthesized successfully: ${outputFilePath} (Total Duration: ${totalDuration.toFixed(2)} seconds)`);

        return { audioFileName, duration: totalDuration };
    }
}