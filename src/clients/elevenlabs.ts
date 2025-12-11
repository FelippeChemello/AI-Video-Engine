/* eslint-disable no-async-promise-executor */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { v4 } from 'uuid';
import path from 'path';
import fs from 'fs'
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { Readable } from 'stream';

import { ENV } from '../config/env'
import { publicDir } from '../config/path';
import { Speaker, TTSClient, voices } from './interfaces/TTS';

const elevenlabs = new ElevenLabsClient({
    apiKey: ENV.ELEVENLABS_API_KEY,
});

export class ElevenLabsTTSClient implements TTSClient {
    public async synthesizeScript(script: { speaker: Speaker, text: string }[], id: string | number = v4()): Promise<{ audioFileName: string, duration: number }> {
        throw new Error('Method not implemented.');
    }

    public async synthesize(voice: Speaker, text: string, id: string | number = v4()): Promise<{ audioFileName: string, duration: number }> {
        console.log(`[ELEVENLABS]: Synthesizing audio for text: ${text}`);

        const { audioFileName, audioFilePath } = await new Promise<{ audioFileName: string, audioFilePath: string }>(
            async (resolve, reject) => {
                const audioFileName = `audio-${id !== undefined ? id : v4()}.mp3`;
                const audioFilePath = path.resolve(publicDir, audioFileName);

                const speech = await elevenlabs.textToSpeech.convert(voices[voice].elevenlabs, {
                    text,
                    outputFormat: 'mp3_44100_128',
                })

                const stream = Readable.fromWeb(speech as any);

                const fileStream = fs.createWriteStream(audioFilePath)
                stream.pipe(fileStream)

                fileStream.on('finish', () => {
                    console.log(`[ELEVENLABS]: Audio file saved at ${audioFilePath}`);

                    resolve({ audioFileName, audioFilePath })
                })
                fileStream.on('error', reject)
            }
        )

        const duration = await getAudioDurationInSeconds(audioFilePath);

        console.log(`[ELEVENLABS]: Audio duration: ${duration}`);

        return { audioFileName, duration }
    }
}