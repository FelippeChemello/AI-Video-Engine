import fs from "fs";
import path from "path";

import { GeminiClient } from "../clients/gemini";
import { SynthesizedAudio, TTSClient } from "../clients/interfaces/TTS";
import { publicDir } from "../config/path";
import { ScriptWithTitle } from "../config/types";
import { FFmpegClient } from "../clients/ffmpeg";
import { AudioEditorClient } from "../clients/interfaces/AudioEditor";
import { OpenAIClient } from "../clients/openai";

const gemini: TTSClient = new GeminiClient();
const openai: TTSClient = new OpenAIClient();
const editor: AudioEditorClient = new FFmpegClient();

export async function synthesizeSpeech(segments: ScriptWithTitle['segments'], maxDurationInSeconds?: number): Promise<{ audioFileName: string, duration?: number }> {
    let audio: SynthesizedAudio;
    try {
        audio = await gemini.synthesizeScript(segments);
    } catch (error) {
        audio = await openai.synthesizeScript(segments);
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
