import fs from "fs";
import path from "path";

import { GeminiClient } from "../clients/gemini";
import { TTSClient } from "../clients/interfaces/TTS";
import { VibeVoiceClient } from "../clients/vibevoice";
import { publicDir } from "../config/path";
import { ScriptWithTitle } from "../config/types";
import { FFmpegClient } from "../clients/ffmpeg";
import { AudioEditorClient } from "../clients/interfaces/AudioEditor";

const gemini: TTSClient = new GeminiClient();
const vibevoice: TTSClient = new VibeVoiceClient();
const editor: AudioEditorClient = new FFmpegClient();

export async function synthesizeSpeech(segments: ScriptWithTitle['segments'], maxDurationInSeconds?: number, client: TTSClient = vibevoice): Promise<{ audioFileName: string, duration?: number }> {
    let audio: { audioFileName: string, duration?: number };
    try {
       audio = await client.synthesizeScript(segments, 'full-script')
    } catch {
        console.log("VibeVoice synthesis failed, trying Gemini TTS...");
        audio = await gemini.synthesizeScript(segments, 'full-script');
    }

    if (!maxDurationInSeconds || !audio.duration) return audio

    if (audio.duration > maxDurationInSeconds) {
        console.log(`Audio duration ${audio.duration}s exceeds maximum for shorts. Speeding up audio...`);
        
        const speedFactor = audio.duration / maxDurationInSeconds;
        const audioPath = path.join(publicDir, audio.audioFileName);
        
        const speededUpAudioPath = await editor.speedUpAudio(audioPath, speedFactor);
        fs.unlinkSync(audioPath);
        
        audio.audioFileName = path.basename(speededUpAudioPath);
    }

    return audio;
}
