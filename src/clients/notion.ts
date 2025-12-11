/* eslint-disable @remotion/deterministic-randomness */
import fs from 'fs'
import { BlockObjectRequest, Client } from "@notionhq/client";
import { v4 } from 'uuid';
import splitFile from 'split-file'
import { SingleBar } from 'cli-progress'

import { NotionMainDatabasePage, ScriptStatus, ScriptWithTitle, SEO, VideoBackground } from "../config/types";
import { ENV } from "../config/env";
import { outputDir, publicDir } from "../config/path";
import { SaveScriptParams, ScriptManagerClient } from './interfaces/ScriptManager';
import { getMimetypeFromFilename } from '../utils/get-mimetype-from-filename';
import console from 'console';
import path from 'path';
import { sleep } from '../utils/sleep';
import { Speaker } from './interfaces/TTS';

const MAX_FILE_SIZE_SINGLE_PART = 20 * 1024 * 1024; // 20 MB
const MAX_FILE_SIZE_PART = 10 * 1024 * 1024; // 10 MB
const MAX_RETRIES_ON_FILE_UPLOAD = 3;

const client = new Client({
    auth: ENV.NOTION_TOKEN,
    timeoutMs: 180000, // 3 minutes
})

export class NotionClient implements ScriptManagerClient {
    private readonly databaseId: string;

    constructor(databaseId?: string) {
        this.databaseId = databaseId || ENV.NOTION_DEFAULT_DATABASE_ID;
    }

    async saveScript({ script, formats, scriptSrc, seo, settings, thumbnailsSrc }: SaveScriptParams): Promise<void> {
        console.log(`[NOTION] Saving script ${script.title}`);

        const audioFileIds: string[] = []
        if (script.audio?.length) {
            for (const audioSrc of script.audio.map(a => a.src)) {
                console.log(`[NOTION] Uploading audio: ${audioSrc}`);
                const fileId = await this.uploadFile(path.join(publicDir, audioSrc));
                audioFileIds.push(fileId);
            }
        }

        let scriptFileId: string | null = null;
        if (scriptSrc) {
            console.log(`[NOTION] Uploading script source file: ${scriptSrc}`);

            scriptFileId = await this.uploadFile(path.join(outputDir, scriptSrc));
        }

        const thumbnailFileIds: Array<string> = [];
        if (thumbnailsSrc?.length) {
            for (const thumbnailFilename of thumbnailsSrc) {
                console.log(`[NOTION] Uploading thumbnail: ${thumbnailFilename}`);

                const thumbnailFileId = await this.uploadFile(path.join(outputDir, thumbnailFilename));
                if (thumbnailFileId) {
                    thumbnailFileIds.push(thumbnailFileId);
                }
            }
        }

        const page = await client.pages.create({
            parent: {
                database_id: this.databaseId,
            },
            properties: {
                Name: {
                    title: [{ text: { content: script.title } }],
                },
                Status: {
                    status: { name: ScriptStatus.NOT_READY },
                },
                Composition: {
                    multi_select: formats ? formats.map((format) => ({ name: format })) : []
                },
                Audio: {
                    files: audioFileIds ? audioFileIds.map((fileId) => ({ type: 'file_upload', file_upload: { id: fileId } })) : []
                },
                Title: {
                    rich_text: [{ type: 'text', text: { content: seo ? `${seo.title}\n\n${seo.description}\n\n${seo.hashtags?.join(" ") || seo.tags?.join(" #") || ''}` : '' } }],
                },
                Output: { 
                    files: [...thumbnailFileIds, scriptFileId].filter(Boolean).map((fileId) => ({
                        type: 'file_upload',
                        file_upload: { id: fileId! },
                    }))
                },
                Date: {
                    date: { start: new Date().toISOString() },
                },
                Settings: {
                    rich_text: [{ type: 'text', text: { content: settings ? JSON.stringify(settings) : '' } }],
                },
            }
        })

        console.log(`[NOTION] Created page: ${page.id}`);

        let lastSpeaker: Speaker = script.segments[0].speaker;
        for (const segment of script.segments) {
            if (lastSpeaker !== segment.speaker) {
                await client.blocks.children.append({
                    block_id: page.id,
                    children: [{
                        type: 'divider',
                        divider: {}
                    }]
                })

                lastSpeaker = segment.speaker;
            }

            let imageId: string | null = null;
            if (segment.mediaSrc) {
                console.log(`[NOTION] Uploading image: ${segment.mediaSrc}`);

                imageId = await this.uploadFile(path.join(publicDir, segment.mediaSrc));
            }

            const children: BlockObjectRequest[] = []
            if (imageId) {
                children.push({
                    type: 'column_list',
                    column_list: {
                        children: [
                            {
                                type: 'column',
                                column: { 
                                    children: [{ 
                                        type: 'paragraph', 
                                        paragraph: { rich_text: [{ type: 'text', text: { content: segment.text } }] } 
                                    }] 
                                }
                            },
                            {
                                type: 'column',
                                column: {
                                    children: [{
                                        type: 'image',
                                        image: {
                                            type: 'file_upload',
                                            file_upload: { id: imageId },
                                            caption: segment.illustration ? [{ type: 'text', text: { content: segment.illustration.description } }] : [],
                                        }
                                    }]
                                }
                            }
                        ]
                    }
                })
            } else {
                children.push({
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [{ type: 'text', text: { content: segment.text } }],
                    }
                })
            }

            await client.blocks.children.append({
                block_id: page.id,
                children
            })

            console.log(`[NOTION] Appended block: ${segment.speaker} - ${segment.text.substring(0, 30)}...`);
        }
    }

    async setSEO(scriptId: string, seo: SEO): Promise<void> {
        console.log(`[NOTION] Setting SEO for script ${scriptId}`);

        await client.pages.update({
            page_id: scriptId,
            properties: {
                Title: {
                    rich_text: [{ type: 'text', text: { content: `${seo.title}\n\n${seo.description}\n\n${seo.hashtags?.join(" ") || seo.tags?.join(" #") || ''}` } }],
                },
            }
        });
    }

    private async getColumnListData(blockId: string): Promise<{ text: string; mediaSrc: string }> {
      const columnList = await client.blocks.children.list({
            block_id: blockId,
            page_size: 10,
        })

        const columnChildren = await Promise.all((columnList.results as Array<BlockObjectRequest>).map(async (columnBlock) => {
            const columnChildren = await client.blocks.children.list({
                // @ts-expect-error id exists in block
                block_id: columnBlock.id,
                page_size: 10,
            }) as unknown as { results: Array<BlockObjectRequest> };

            const column = columnChildren.results[0];

            switch (column.type) {
                case 'image':
                    // @ts-expect-error file is an object
                    return { mediaSrc: column.image.file.url };
                case 'paragraph':
                    const text = column.paragraph.rich_text.map((text) => text.type === 'text' ? text.text.content : '').join('\n');
                    return { text };
                case 'video':
                    // @ts-expect-error file is an object
                    return { mediaSrc: column.video.file.url };
            }
        }))

        const columnData = columnChildren.reduce((acc, child) => ({
            ...acc,
            ...child,
        }), { text: '', mediaSrc: '' });

        return columnData;
    }

    async retrieveScript(status: ScriptStatus, limit?: number): Promise<Array<ScriptWithTitle>> {
        console.log(`[NOTION] Retrieving scripts with status: ${status}`);

        const response = await client.databases.query({
            database_id: this.databaseId,
            filter: {
                property: 'Status',
                status: {
                    equals: status,
                },
            },
            page_size: limit && limit > 0 && limit <= 100 ? limit : 100,
        })

        console.log(`[NOTION] Found ${response.results.length} scripts`);
        const scripts: Array<ScriptWithTitle> = [];

        let pageIndex = 0;
        for (const page of response.results as unknown as Array<NotionMainDatabasePage>) {
            pageIndex++;

            // @ts-expect-error file is an object
            const audios = page.properties.Audio.files.map((file) => ({ url: file.file.url, name: file.name }));
            const compositions = page.properties.Composition.multi_select.map((c) => c.name);
            const title = page.properties.Name.title[0].text.content;
            const seo = page.properties.Title.rich_text[0].text.content;
            const settings = page.properties.Settings.rich_text[0]?.text.content ? JSON.parse(page.properties.Settings.rich_text[0].text.content) : undefined;
            const outputs = page.properties.Output.files;

            const thumbnails = outputs
              .filter(file => file.name.includes('Thumbnail'))
              .map(file => ({ filename: file.name, src: file.file.url }));

            const segments: ScriptWithTitle['segments'] = [];

            console.log(`[NOTION] [PAGE:${pageIndex}/${response.results.length}]: ${title}`);

            const blocks = await client.blocks.children.list({
                block_id: page.id,
                page_size: 1000,
            }) as unknown as { results: Array<BlockObjectRequest> };

            let lastSpeaker: Speaker = Speaker.Cody;
            if (blocks.results[0].type === 'paragraph' || blocks.results[0].type === 'column_list') {
                let firstText = ""
                switch (blocks.results[0].type) {
                    case 'paragraph':
                        firstText = blocks.results[0].paragraph.rich_text.map((text) => text.type === 'text' ? text.text.content : '').join('\n');
                        break;
                    case 'column_list':
                        // @ts-expect-error id exists in block
                        const { text } = await this.getColumnListData(blocks.results[0].id);
                        firstText = text;
                        break
                }

                const speakerMatch = firstText.match(/\[(\w+)\]/);
                if (speakerMatch) {
                    const speakerName = speakerMatch[1];
                    if (Object.values(Speaker).includes(speakerName as Speaker)) {
                        lastSpeaker = speakerName as Speaker;
                    }
                }
            }

            for (const [blockIndex, block] of blocks.results.entries()) {
                switch (block.type) {
                    case 'divider':
                        lastSpeaker = lastSpeaker === Speaker.Cody ? Speaker.Felippe : Speaker.Cody;
                        break;

                    case 'paragraph':
                        const rawText = block.paragraph.rich_text.map((text) => text.type === 'text' ? text.text.content : '').join('\n');
                        if (rawText.trim() === '') {
                            break;
                        }

                        const speaker = rawText.match(/\[(\w+)\]/);
                        if (speaker) {
                            const speakerName = speaker[1];
                            if (Object.values(Speaker).includes(speakerName as Speaker)) {
                                lastSpeaker = speakerName as Speaker;
                            }
                        }
                        
                        segments.push({ text: rawText, speaker: lastSpeaker });
                        break;

                    case 'column_list':
                        // @ts-expect-error id exists in block
                        const { mediaSrc, text } = await this.getColumnListData(block.id);

                        const speakerInText = text.match(/\[(\w+)\]/);
                        if (speakerInText) {
                            const speakerName = speakerInText[1];
                            if (Object.values(Speaker).includes(speakerName as Speaker)) {
                                lastSpeaker = speakerName as Speaker;
                            }
                        }

                        segments.push({ speaker: lastSpeaker, text, mediaSrc });
                        break;
                }

                if (block.type !== 'divider') {
                  console.log(`[NOTION] [BLOCK:${blockIndex+1}/${blocks.results.length}]: ${lastSpeaker} - ${segments.at(-1)?.text.substring(0, 30) || ''}...`);
                }
            }

            const audio = audios.map((audio) => {
                const { extension, mimeType } = getMimetypeFromFilename(audio.name);

                return {
                    src: audio.url,
                    extension,
                    mimeType,
                }
            })

            
            scripts.push({ 
                id: page.id,
                title, 
                segments, 
                audio,
                compositions,
                seo,
                settings,
                thumbnails,
            });
        }

        console.log(`[NOTION] Retrieved ${scripts.length} scripts`);
        return scripts;
    }

    async updateScriptStatus(pageId: string, status: ScriptStatus): Promise<void> {
        console.log(`[NOTION] Updating script status for page ${pageId} to ${status}`);

        await client.pages.update({
            page_id: pageId,
            properties: {
                Status: { status: { name: status } },
            }
        })
    }

    async retrieveAssets(pageId: string): Promise<{ background: VideoBackground }> {
        console.log(`[NOTION] Retrieving assets for page ${pageId}`);

        const availableBackgroundVideos = fs.readdirSync(path.join(publicDir, 'assets'))
            .filter(file => file.endsWith('.mp4'))
            .map(file => ({
                src: `assets/${file}`,
                name: file.replace('.mp4', ''),
            }));

        const randomBackgroundVideo = availableBackgroundVideos[Math.floor(Math.random() * availableBackgroundVideos.length)];

        const background: VideoBackground = {
            color: "oklch(97% 0 0)",
            mainColor: "oklch(68.5% 0.169 237.323)",
            secondaryColor: "oklch(29.3% 0.066 243.157)",
            seed: v4(),
            video: {
                src: randomBackgroundVideo?.src,
            }
        }

        console.log(`[NOTION] Selected background video: ${randomBackgroundVideo?.name || 'none'}`);

        return { background };
    }

    async downloadAssets(script: ScriptWithTitle): Promise<ScriptWithTitle> {
        console.log(`[NOTION] Downloading assets for script ${script.title}`);

        for (const thumbnail of script.thumbnails || []) {
            console.log(`[NOTION] Downloading thumbnail: ${thumbnail.src}`);

            const filePath = `${outputDir}/${v4()}.${thumbnail.src.split('.').pop()?.split('?')[0]}`;

            const response = await fetch(thumbnail.src);
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(filePath, Buffer.from(buffer));
            
            const filename = filePath.split('/').pop()
            if (filename) {
                thumbnail.src = filename;
            }
        }

        if (script.audio?.length) {
            for (const audioSrcIndex in script.audio) {
                const audioSrc = script.audio[audioSrcIndex].src;
                console.log(`[NOTION] Downloading audio: ${audioSrc}`);

                const filePath = `${publicDir}/${v4()}.${audioSrc.split('.').pop()?.split('?')[0]}`;

                const response = await fetch(audioSrc);
                const buffer = await response.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buffer));

                const filename = filePath.split('/').pop()
                if (!filename) {
                    throw new Error(`[NOTION] Failed to extract filename from path: ${filePath}`);
                } 

                script.audio[audioSrcIndex].src = filename;
            }
        }

        for (const segment of script.segments) {
            if (segment.mediaSrc) {
                console.log(`[NOTION] Downloading image: ${segment.mediaSrc}`);

                const filePath = `${publicDir}/${v4()}.${segment.mediaSrc.split('.').pop()?.split('?')[0]}`;

                const response = await fetch(segment.mediaSrc);
                const buffer = await response.arrayBuffer();
                fs.writeFileSync(filePath, Buffer.from(buffer));
                
                const filename = filePath.split('/').pop()
                if (filename) {
                    segment.mediaSrc = filename;
                } else {
                    console.error(`[NOTION] Failed to extract filename from path: ${filePath}`);
                }
            }
        }

        return script;
    }

    async downloadOutputOfDoneScripts(): Promise<Array<string>> {
        console.log('[NOTION] Downloading outputs');

        const response = await client.databases.query({
            database_id: this.databaseId,
            filter: {
                property: 'Status',
                status: {
                    equals: ScriptStatus.DONE,
                },
            },
        })

        console.log(`[NOTION] Found ${response.results.length} scripts with output available to download`);

        const filesDownloaded: Array<string> = [];
        for (const page of response.results as unknown as Array<NotionMainDatabasePage>) {
            const title = page.properties.Name.title[0].text.content;
            const outputFiles = page.properties.Output.files;

            console.log(`[NOTION] Downloading output for script: ${title}`);

            for (const file of outputFiles) {
                const fileUrl = file.file.url;
                const fileName = file.name;

                console.log(`[NOTION] Downloading file: ${fileName}`);

                const response = await fetch(fileUrl);
                const buffer = await response.arrayBuffer();
                
                const filePath = path.join(outputDir, fileName);
                fs.writeFileSync(filePath, Buffer.from(buffer));

                filesDownloaded.push(filePath);

                console.log(`[NOTION] Saved file: ${fileName}`);
            }
        }

        console.log('[NOTION] Finished downloading all outputs');

        return filesDownloaded;
    }

    async saveOutput(scriptId: string, output: Array<string>): Promise<void> {
        const files: Array<{ type: 'file_upload', file_upload: { id: string } }> = [];

        for (const file of output) {
            console.log(`[NOTION] Saving output file: ${file}`);

            const fileId = await this.uploadFile(file);
            files.push({
                type: 'file_upload',
                file_upload: {
                    id: fileId,
                }
            });
        }

        console.log(`[NOTION] Updating page ${scriptId} with output files`);

        const page = await client.pages.retrieve({ page_id: scriptId }) as unknown as NotionMainDatabasePage;
        
        await client.pages.update({
            page_id: scriptId,
            properties: { 
                Output: { 
                    // @ts-expect-error Type incorrect, but works
                    files: [...page.properties.Output.files, ...files]
                } 
            },
        });
    }

    private async uploadFile(filePath: string): Promise<string> {
        const { extension, mimeType } = getMimetypeFromFilename(filePath);
        const filename = filePath.split('/').pop() || `file.${extension}`;
        const fileSize = fs.statSync(filePath).size;

        console.log(`[NOTION] Uploading file: ${filePath} (MIME type: ${mimeType}, size: ${fileSize} bytes)`);

        if (fileSize > MAX_FILE_SIZE_SINGLE_PART) {
            console.log(`[NOTION] File size exceeds maximum part size (${MAX_FILE_SIZE_SINGLE_PART} bytes). Splitting file...`);

            const parts = await splitFile.splitFileBySize(filePath, MAX_FILE_SIZE_PART, outputDir);
            const mimeType = getMimetypeFromFilename(filePath).mimeType;

            console.log(`[NOTION] File split into ${parts.length} parts`);

            const fileUpload = await client.fileUploads.create({ 
                mode: 'multi_part', 
                content_type: mimeType, 
                filename, 
                number_of_parts: parts.length
            });

            const progressBar = new SingleBar({
                format: `[NOTION] Uploading parts | {bar} | {percentage}% | {value}/{total} | {eta}s`,
                hideCursor: true,
                clearOnComplete: false,
                fps: 2,
            });

            progressBar.start(parts.length, 1);

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const partNumber = i + 1;

                let retryCount = 0;
                while (retryCount < MAX_RETRIES_ON_FILE_UPLOAD) {
                    try {
                        await client.fileUploads.send({
                            file_upload_id: fileUpload.id,
                            part_number: partNumber.toString(),
                            file: {
                                data: new Blob([await fs.openAsBlob(part)], { type: mimeType }),
                            }
                        })

                        progressBar.update(i + 1);
                        break;
                    } catch (error: any) {
                        if (retryCount < MAX_RETRIES_ON_FILE_UPLOAD) {
                            retryCount++;

                            const waitTime = Math.pow(2, retryCount) * 1000;
                            await sleep(waitTime);
                        } else {
                            throw new Error(`[NOTION] Failed to upload part ${partNumber} after ${MAX_RETRIES_ON_FILE_UPLOAD} retries: ${error.message}`);
                        }
                    }
                }
            }

            parts.forEach(part => fs.unlinkSync(part)); 
            progressBar.stop();

            await client.fileUploads.complete({
                file_upload_id: fileUpload.id,
            })

            console.log(`[NOTION] File uploaded: ${fileUpload.id}`);

            return fileUpload.id
        } else {
            const mimeType = getMimetypeFromFilename(filePath).mimeType;
            const isText = mimeType.startsWith('text/');

            const data = isText
                ? new Blob([fs.readFileSync(filePath, 'utf-8')], { type: mimeType })
                : new Blob([fs.readFileSync(filePath)], { type: mimeType });

            const fileUpload = await client.fileUploads.create({ mode: 'single_part' });
            const file = await client.fileUploads.send({
                file_upload_id: fileUpload.id,
                file: {
                    filename: filePath.split('/').pop() || 'file',
                    data,
                }
            })

            console.log(`[NOTION] File uploaded: ${file.id}`);

            return file.id;
        }
    }
}