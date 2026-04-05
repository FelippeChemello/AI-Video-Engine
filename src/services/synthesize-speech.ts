import fs from "fs";
import path from "path";

import { GeminiClient } from "../clients/gemini";
import { SynthesizedAudio, TTSClient } from "../clients/interfaces/TTS";
import { publicDir } from "../config/path";
import { ScriptWithTitle } from "../config/types";
import { FFmpegClient } from "../clients/ffmpeg";
import { AudioEditorClient } from "../clients/interfaces/AudioEditor";
import { FishAudioTTSClient } from "../clients/fishaudio";
import { OpenAIClient } from "../clients/openai";
import { QwenClient } from "../clients/qwen";

const qwen: TTSClient = new QwenClient();
const gemini: TTSClient = new GeminiClient();
const fishaudio: TTSClient = new FishAudioTTSClient();
const openai: TTSClient = new OpenAIClient();
const editor: AudioEditorClient = new FFmpegClient();

export async function synthesizeSpeech(
    segments: ScriptWithTitle['segments'], 
    maxDurationInSeconds?: number,
    engines: Array<TTSClient> = [qwen, gemini, fishaudio, openai]
): Promise<{ audioFileName: string, duration?: number }> {
    let audio: SynthesizedAudio | undefined;
    for (const engine of engines) {
        try {
            audio = await engine.synthesizeScript(segments);
            console.log(`Audio synthesized successfully with ${engine.constructor.name}`);
            break;
        } catch (error) {
            console.error(`Error synthesizing audio with ${engine.constructor.name}:`, error);
        }
    }

    if (!audio) {
        throw new Error("All TTS engines failed to synthesize speech.");
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
