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
import { GrokClient } from "../clients/grok";
import { v4 } from "uuid";

const qwen: TTSClient = new QwenClient();
const gemini: TTSClient = new GeminiClient();
const fishaudio: TTSClient = new FishAudioTTSClient();
const openai: TTSClient = new OpenAIClient();
const grok: TTSClient = new GrokClient();
const editor: AudioEditorClient = new FFmpegClient();

type SynthesizeSpeechOptions = {
    maxDurationInSeconds?: number;
    engines?: Array<TTSClient>;
    singleFileExport?: boolean;
}

export async function synthesizeSpeech(
    segments: ScriptWithTitle['segments'],
    { 
        maxDurationInSeconds, 
        engines = [grok, fishaudio, gemini, openai, qwen],
        singleFileExport = true
    }: SynthesizeSpeechOptions = {}
): Promise<SynthesizedAudio> {
    if (singleFileExport) {
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

    const uniqueId = v4();
    const synthesizedSegments = await Promise.all(segments.map(async (segment, segmentIndex) => {
        let audio: SynthesizedAudio | undefined;
        
        for (const engine of engines) {
            try {
                audio = await engine.synthesize(segment.speaker, segment.text, `${uniqueId}-${segmentIndex}`);
                console.log(`Segment audio synthesized successfully with ${engine.constructor.name}`);
                break;
            } catch (error) {
                console.error(`Error synthesizing segment audio with ${engine.constructor.name}:`, error);
            }
        }

        if (!audio) {
            throw new Error("All TTS engines failed to synthesize speech for a segment.");
        }

        return audio;
    }));

    const totalDuration = synthesizedSegments.reduce((sum, audio) => sum + audio.duration, 0);
    if (maxDurationInSeconds && totalDuration > maxDurationInSeconds) {
        console.log(`Total audio duration ${totalDuration}s exceeds maximum for shorts. Speeding up audio...`);
        
        const speedFactor = totalDuration / maxDurationInSeconds;
        const adjustedSegments = await Promise.all(synthesizedSegments.map(async (audio) => {
            const audioPath = path.join(publicDir, audio.audioFileName);
            const speededUpAudioPath = await editor.speedUpAudio(audioPath, speedFactor);
            fs.unlinkSync(audioPath);
            return {
                audioFileName: path.basename(speededUpAudioPath),
                duration: audio.duration / speedFactor
            };
        }));
        
        return {
            audioFileName: adjustedSegments.map(s => s.audioFileName).join(","),
            duration: totalDuration / speedFactor
        };
    }

    return {
        audioFileName: synthesizedSegments.map(s => s.audioFileName).join(","),
        duration: totalDuration
    };
}
