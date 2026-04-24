import fs from 'fs';
import path from 'path';
import { v4 } from "uuid";
import { FishAudioClient } from 'fish-audio'
import { TTSClient, Speaker, voices } from "./interfaces/TTS";
import { ENV } from "../config/env";
import { publicDir } from '../config/path';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { cleanupFiles } from '../services/cleanup-files';
import { concatAudioFiles } from '../utils/concat-audio-files';
import { sanitizeText } from '../utils/sanitize-text';

const fishAudio = new FishAudioClient({ apiKey: ENV.FISH_AUDIO_API_KEY })

export class FishAudioTTSClient implements TTSClient {
    public async synthesizeScript(script: { speaker: Speaker, text: string }[], id: string | number = v4()): Promise<{ audioFileName: string, duration: number }> {
        console.log(`[FISHAUDIO] Synthesizing script with ${script.length} segments`);
        
        const finalFileName = `audio-${id}.mp3`;
        const filePath = path.join(publicDir, finalFileName);

        const individualAudioFiles: string[] = [];
        for (const segment of script) {
            const { audioFileName } = await this.synthesize(segment.speaker, sanitizeText(segment.text));
            individualAudioFiles.push(path.join(publicDir, audioFileName));
        }

        await concatAudioFiles(individualAudioFiles, filePath);
        cleanupFiles(individualAudioFiles);

        const duration = await getAudioDurationInSeconds(filePath);
        return {
            audioFileName: finalFileName,
            duration
        }
    }

    public async synthesize(voice: Speaker, text: string, id: string | number = v4()): Promise<{ audioFileName: string, duration: number }> {
        const voiceId = voices[voice].fishaudio;
        console.log(`[FISHAUDIO] Synthesizing speech for speaker: ${voice}`);

        const audio = await fishAudio.textToSpeech.convert({
            format: 'mp3',
            text,
            reference_id: [voiceId] as any,
        })

        const speechFile = `audio-${id}.mp3`;
        const filePath = path.join(publicDir, speechFile);
        const arrayBuffer = await new Response(audio as any).arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

        const duration = await getAudioDurationInSeconds(filePath);

        return {
            audioFileName: speechFile,
            duration
        }
    }
}