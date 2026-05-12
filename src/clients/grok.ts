import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod'
import path from 'path';
import fs, { writeFileSync } from 'fs';

import { ENV } from '../config/env';
import { Agent, AgentOutput, Agents, LLMClient } from './interfaces/LLM';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';
import { Speaker, SynthesizedAudio, TTSClient, voices } from './interfaces/TTS';
import { Script } from '../config/types';
import { v4 } from 'uuid';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { publicDir } from '../config/path';
import { cleanupFiles } from '../services/cleanup-files';
import { concatAudioFiles } from '../utils/concat-audio-files';

const baseURL = 'https://api.x.ai/v1';

const openai = new OpenAI({
    apiKey: ENV.GROK_API_KEY,
    baseURL
});

export class GrokClient implements LLMClient, TTSClient {
    public async synthesizeScript(script: Script, id: string | number = v4()): Promise<{ audioFileName: string, duration: number }> {
        console.log(`[GROK] Synthesizing script with ${script.length} segments`);
        
        const finalFileName = `audio-${id}.mp3`;
        const filePath = path.join(publicDir, finalFileName);

        const individualAudioFiles: string[] = await Promise.all(script.map(async (segment, index) => {
            const { audioFileName } = await this.synthesize(segment.speaker, segment.text, `${id}-${index}`);
            return path.join(publicDir, audioFileName);
        }));

        await concatAudioFiles(individualAudioFiles, filePath);
        cleanupFiles(individualAudioFiles);

        const duration = await getAudioDurationInSeconds(filePath);
        return {
            audioFileName: finalFileName,
            duration
        }
    }

    async synthesize(voice: Speaker, text: string, id: string | number = v4()): Promise<SynthesizedAudio> {
        const voiceId = voices[voice].grok;

        const response = await fetch(`${baseURL}/tts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ENV.GROK_API_KEY}`
            },
            body: JSON.stringify({
                text,
                voice_id: voiceId,
                output_format: { codec: 'mp3', sample_rate: 44100, bit_rate: 128000 },
                language: 'pt-BR',
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`[GROK] TTS request failed with status ${response.status}: ${errorText}`);
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());

        const audioFileName = `audio-${id}.mp3`;
        const filePath = `${publicDir}/${audioFileName}`

        writeFileSync(filePath, audioBuffer, 'utf-8')

        console.log(`[GROK] Audio synthesized successfully: ${filePath}`);

        const duration = await getAudioDurationInSeconds(filePath);
        console.log(`[GROK] Audio duration: ${duration}`);

        return { audioFileName, duration }
    }

    async complete<T extends Agent>(agent: T, prompt: string | unknown, filesSrc?: Array<string>): Promise<AgentOutput<T>> {
        console.log(`[GROK] Running agent: ${agent}`);

        const config = Agents[agent];

        const inputFiles = filesSrc ? filesSrc.map(src => ({
            type: 'input_file' as const,
            filename: path.basename(src),
            file_data: `data:${getMimetypeFromFilename(path.basename(src)).mimeType};base64,${fs.readFileSync(src).toString('base64')}`,
        })) : []

        const response = await openai.responses.parse({
            model: config.model.grok,
            instructions: config.systemPrompt,
            input: [
                {
                    role: 'user',
                    content: [
                        { type: 'input_text', text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) },
                        ...inputFiles
                    ]
                },
            ],
            // @ts-expect-error xAI specific tools parameter
            tools: [{ type: 'web_search' }, { type: 'x_search' }],
            text: {
                format: zodTextFormat(config.outputStructure, 'output_parsed'),
            }
        })

        const output = response.output_parsed

        if (!output) {
            throw new Error(`[GROK] response did not contain the expected output format for agent ${agent}.`);
        }

        return output;
    }
}