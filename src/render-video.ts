import fs from 'fs';
import path from 'path';
import { getVideoDurationInSeconds } from 'get-video-duration';

import { ScriptStatus } from './config/types';
import { publicDir } from './config/path';
import { ScriptManagerClient } from './clients/interfaces/ScriptManager';
import { NotionClient } from './clients/notion';
import { AudioAlignerClient } from './clients/interfaces/AudioAligner';
import { MFAClient } from './clients/mfa';
import { VideoRendererClient } from './clients/interfaces/VideoRenderer';
import { RemotionClient } from './clients/remotion';
import { VideoEditorClient } from './clients/interfaces/VideoEditor';
import { FFmpegClient } from './clients/ffmpeg';
import { AeneasClient } from './clients/aeneas';
import { VisemeAlignerClient } from './clients/interfaces/VisemeAligner';
import { AudioEditorClient } from './clients/interfaces/AudioEditor';
import { VideoUploaderClient } from './clients/interfaces/VideoUploader';
import { Youtube } from './clients/youtube';
import { ENV } from './config/env';

const MAX_DURATION_FOR_SHORT_CONVERSION = 350;
const MAX_DURATION_OF_SHORT_VIDEO = 175;

const defaultScriptManager: ScriptManagerClient = new NotionClient(ENV.NOTION_DEFAULT_DATABASE_ID);
const newsScriptManager: ScriptManagerClient = new NotionClient(ENV.NOTION_NEWS_DATABASE_ID);
const audioAligner: AudioAlignerClient = new AeneasClient();
const visemeAligner: VisemeAlignerClient = new MFAClient();
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

for (const script of scripts) {
    if (!script.id) {
        console.log(`Script "${script.title}" does not have an ID`);
        continue;
    }

    if (!script.audioSrc || !script.audioMimeType) {
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

        const audioFilePath = path.join(publicDir, script.audioSrc);
        const fullText = script.segments.map((segment) => segment.text).join('\n');

        console.log(`Aligning audio for script ${script.title}...`);
        const audio = await audioAligner.alignAudio({
            audio: {
                filepath: audioFilePath,
                mimeType: script.audioMimeType!
            },
            text: fullText
        })

        script.alignment = audio.alignment;
        script.duration = audio.duration;

        const { visemes } = await visemeAligner.alignViseme({
            audio: {
                filepath: audioFilePath,
                mimeType: script.audioMimeType!
            },
            text: fullText
        });

        script.visemes = visemes;

        const scriptFileName = `script-${script.id}.json`;
        fs.writeFileSync(path.join(publicDir, scriptFileName), JSON.stringify(script, null, 2));

        const videos: string[] = []
        for (const composition of script.compositions) {
            console.log(`Rendering ${composition} for script ${script.title}...`);
            const videoPath = await renderer.renderVideo(script, composition, rendererBundle);

            console.log(`Rendered video for composition ${composition} at path: ${videoPath}`);
            videos.push(videoPath);

            const videoDuration = await getVideoDurationInSeconds(videoPath);
            if (
                composition === 'Portrait' 
                && videoDuration <= MAX_DURATION_FOR_SHORT_CONVERSION 
                && videoDuration > MAX_DURATION_OF_SHORT_VIDEO
                && !script.compositions.includes('Landscape')
            ) {
                const speedFactor = Math.ceil((videoDuration / MAX_DURATION_OF_SHORT_VIDEO) * 100) / 100;

                console.log(`Speeding up video by a factor of ${speedFactor} to convert to short format`);
                const videoShortPath = await editor.speedUpVideo(videoPath, speedFactor);
                
                console.log(`Speeded up video saved at: ${videoShortPath}`);
                videos.push(videoShortPath);
            }
        }

        console.log(`Saving output...`);
        await defaultScriptManager.saveOutput(script.id, videos)
        await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.DONE);

        console.log('Uploading videos...');
        const [title, ...description] = script.seo ? script.seo.split('\n') : [script.title, ''];

        for (const videoPath of videos) {
            const uploadResult = await youtube.uploadVideo(
                videoPath,
                title,
                description.join('\n'),
            );

            console.log(`Video uploaded: ${uploadResult.url}`);
        }

        await defaultScriptManager.updateScriptStatus(script.id, ScriptStatus.PUBLISHED);

        console.log(`Cleaning up assets for script ${script.title}...`);

        if (fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
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
        
        const audioFilePath = path.join(publicDir, script.audioSrc);
        if (fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
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