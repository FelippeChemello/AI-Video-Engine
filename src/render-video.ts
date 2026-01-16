import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { getVideoDurationInSeconds } from 'get-video-duration';

import { Channels, compositionOrientationMap, Compositions, Orientation, ScriptStatus } from './config/types';
import { outputDir, publicDir } from './config/path';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { AudioAlignerClient } from './clients/interfaces/AudioAligner';
import { MFAClient } from './clients/mfa';
import { VideoRendererClient } from './clients/interfaces/VideoRenderer';
import { RemotionClient } from './clients/remotion';
import { VideoEditorClient } from './clients/interfaces/VideoEditor';
import { FFmpegClient } from './clients/ffmpeg';
import { AeneasClient } from './clients/aeneas';
import { compositionShouldAlignVisemes, VisemeAlignerClient } from './clients/interfaces/VisemeAligner';
import { AudioEditorClient } from './clients/interfaces/AudioEditor';
import { VideoUploaderClient } from './clients/interfaces/VideoUploader';
import { Youtube } from './clients/youtube';
import { ENV } from './config/env';
import { Agent, LLMClient } from './clients/interfaces/LLM';
import { OpenAIClient } from './clients/openai';
import { sanitizeText } from './utils/sanitize-text';

const MAX_DURATION_FOR_SHORT_CONVERSION = 350;
const MAX_DURATION_OF_SHORT_VIDEO = 175;

const defaultScriptManager: ScriptManagerClient = new NotionClient(ENV.NOTION_DEFAULT_DATABASE_ID);
const newsScriptManager: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const audioAligner: AudioAlignerClient = new AeneasClient();
const visemeAligner: VisemeAlignerClient = new MFAClient();
const openai: LLMClient = new OpenAIClient();
const renderer: VideoRendererClient = new RemotionClient();
const editor: VideoEditorClient & AudioEditorClient = new FFmpegClient();
const youtube: VideoUploaderClient = new Youtube();

const defaultScripts = await defaultScriptManager.retrieveScript(ScriptStatus.NOT_STARTED);
const newsScripts = await newsScriptManager.retrieveScript(ScriptStatus.NOT_STARTED);

const scripts = [...defaultScripts, ...newsScripts];
if (scripts.length === 0) {
    console.log('No scripts to process.');
    process.exit(0);
}

for (const script of scripts) {
    console.log(`Downloading assets for script ${script.title}...`);
    await defaultScriptManager.downloadAssets(script);
}

const rendererBundle = await renderer.getBundle();
console.log(`Renderer bundle created at: ${rendererBundle}`);

for (const scriptIndex in scripts) {
    const script = scripts[scriptIndex];
    console.log(`\nProcessing script ${parseInt(scriptIndex) + 1} of ${scripts.length}: ${script.title}`);

    if (!script.id) {
        console.log(`Script "${script.title}" does not have an ID`);
        continue;
    }

    if (!script.audio?.length) {
        console.log(`Script "${script.title}" does not have audio source or mime type`);
        continue;
    }

    if (!script.compositions || script.compositions.length === 0) {
        console.log(`Script "${script.title}" does not target any compositions`);
        continue;
    }

    try {
        await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.IN_PROGRESS);

        const assets = await defaultScriptManager.retrieveAssets(script.id);
        script.background = assets.background;

        script.segments = script.segments.map((segment) => ({
            ...segment,
            text: sanitizeText(segment.text)
        }))

        for (const audioIndex in script.audio) {
            const { src: audioFileName, mimeType: audioMimeType } = script.audio[audioIndex];
            const audioFilePath = path.join(publicDir, audioFileName);
            const fullText = script.audio.length === 1 
                ? script.segments.map((s) => s.text).join(' ') 
                : script.segments[audioIndex].text;

            console.log(`Aligning audio for script ${script.title}...`);
            const audioAligned = await audioAligner.alignAudio({
                audio: {
                    filepath: audioFilePath,
                    mimeType: audioMimeType!
                },
                text: fullText
            })

            script.audio[audioIndex].alignment = audioAligned.alignment;
            script.audio[audioIndex].duration = audioAligned.duration;

            if (script.compositions.some(comp => compositionShouldAlignVisemes[comp])) {
                console.log(`Aligning visemes for script ${script.title}...`);
                const { visemes } = await visemeAligner.alignViseme({
                    audio: {
                        filepath: audioFilePath,
                        mimeType: audioMimeType!
                    },
                    text: fullText
                });

                script.audio[audioIndex].visemes = visemes;
            }
        }

        const scriptFileName = `script-${script.id}.json`;
        fs.writeFileSync(path.join(publicDir, scriptFileName), JSON.stringify(script, null, 2));

        const videos: Array<{ videoPath: string; composition: Compositions }> = [];
        for (const composition of script.compositions) {
            console.log(`Rendering ${composition} for script ${script.title}...`);
            const videoPath = await renderer.renderVideo(script, composition, rendererBundle);

            console.log(`Rendered video for composition ${composition} at path: ${videoPath}`);

            const videoDuration = await getVideoDurationInSeconds(videoPath);
            let finalVideoPath = videoPath;
            if (
                compositionOrientationMap[composition] === Orientation.PORTRAIT
                && videoDuration <= MAX_DURATION_FOR_SHORT_CONVERSION 
                && videoDuration > MAX_DURATION_OF_SHORT_VIDEO
            ) {
                const speedFactor = Math.ceil((videoDuration / MAX_DURATION_OF_SHORT_VIDEO) * 100) / 100;

                console.log(`Speeding up video by a factor of ${speedFactor} to convert to short format`);
                const videoShortPath = await editor.speedUpVideo(videoPath, speedFactor);
                finalVideoPath = videoShortPath;
                
                console.log(`Speeded up video saved at: ${videoShortPath}`);
            }

            videos.push({ videoPath: finalVideoPath, composition });
        }

        console.log(`Saving output...`);
        await defaultScriptManager.saveOutput(script.id, videos.map(v => v.videoPath));
        await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.DONE);

        console.log("Generating SEO content...");
        const { text: seoText } = await openai.complete(Agent.SEO_WRITER,  script.segments.map((s) => s.text).join('\n'))
        const seo = JSON.parse(seoText);

        await defaultScriptManager.setSEO(script.id, seo);

        if (script.channels?.includes(Channels.CODESTACK)) {
            console.log('Uploading videos...');
            
            for (const video of videos) {
                const thumbnail = script.thumbnails?.find(t => {
                    const thumbOrientation = compositionOrientationMap[video.composition];
                    return t.filename.includes(thumbOrientation);
                })

                const uploadResult = await youtube.uploadVideo(
                    video.videoPath,
                    seo.title,
                    `${seo.description}\n\n ${seo.hashtags.join(' ')}`,
                    thumbnail ? path.join(outputDir, thumbnail.src) : undefined,
                    seo.tags,
                    dayjs().add(Number(scriptIndex), 'hours').toDate()
                );

                console.log(`Video uploaded: ${uploadResult.url}`);
            }

            await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.PUBLISHED);
        }
        
        console.log(`Cleaning up assets for script ${script.title}...`);

        for (const audio of script.audio) {
            const audioFilePath = path.join(publicDir, audio.src);
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }
        }
        
        const scriptFilePath = path.join(publicDir, scriptFileName);
        if (fs.existsSync(scriptFilePath)) {
            fs.unlinkSync(scriptFilePath);
        }
        
        for (const segment of script.segments) {
            if (segment.mediaSrc) {
                const mediaFilePath = path.join(publicDir, segment.mediaSrc);
                if (fs.existsSync(mediaFilePath)) {
                    fs.unlinkSync(mediaFilePath);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing script ${script.title}:`, error);

        await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.ERROR);
        
        for (const audio of script.audio) {
            const audioFilePath = path.join(publicDir, audio.src);
            if (fs.existsSync(audioFilePath)) {
                fs.unlinkSync(audioFilePath);
            }
        }
        
        const scriptFilePath = path.join(publicDir, `script-${script.id}.json`);
        if (fs.existsSync(scriptFilePath)) {
            fs.unlinkSync(scriptFilePath);
        }
        
        for (const segment of script.segments) {
            if (segment.mediaSrc) {
                const mediaFilePath = path.join(publicDir, segment.mediaSrc);
                if (fs.existsSync(mediaFilePath)) {
                    fs.unlinkSync(mediaFilePath);
                }
            }
        }
    }
}

fs.rmSync(rendererBundle, { recursive: true, force: true })
console.log('All scripts processed.');