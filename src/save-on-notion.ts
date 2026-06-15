import fs from 'fs';
import path from 'path';

import { NotionClient } from './clients/notion';
import { Channels, Compositions, ScriptWithTitle, scriptWithTitleSchema } from './config/types';
import { outputDir, publicDir } from './config/path';
import { generateThumbnails } from './services/generate-thumbnails';
import { generateIllustration } from './services/generate-illustration';
import { saveScriptFile } from './services/save-script-file';
import { titleToFileName } from './utils/title-to-filename';

interface RawArgs {
    [key: string]: string | boolean | string[];
}

function parseArgs(args: string[]): RawArgs {
    const parsed: RawArgs = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('-')) {
            const equalsIndex = arg.indexOf('=');
            let key = equalsIndex !== -1 ? arg.substring(0, equalsIndex) : arg;
            key = key.replace(/^-+/, '');

            let value: string | boolean;
            if (equalsIndex !== -1) {
                value = arg.substring(equalsIndex + 1);
            } else {
                const nextArg = args[i + 1];
                if (nextArg !== undefined && !nextArg.startsWith('-')) {
                    value = nextArg;
                    i++;
                } else {
                    value = true;
                }
            }

            const existing = parsed[key];
            if (existing !== undefined) {
                if (Array.isArray(existing)) {
                    existing.push(value as string);
                } else {
                    parsed[key] = [existing as string, value as string];
                }
            } else {
                parsed[key] = value;
            }
        } else {
            if (!parsed['_']) {
                parsed['_'] = [];
            }
            (parsed['_'] as string[]).push(arg);
        }
    }
    return parsed;
}

const rawArgs = parseArgs(process.argv.slice(2));

function getArrayOption(key: string, aliases: string[] = []): string[] | undefined {
    const keys = [key, ...aliases];
    for (const k of keys) {
        const val = rawArgs[k];
        if (val !== undefined) {
            if (Array.isArray(val)) {
                return val.flatMap(v => v.split(',').map(s => s.trim()));
            }
            if (typeof val === 'string') {
                return val.split(',').map(s => s.trim());
            }
        }
    }
    return undefined;
}

function getJsonOption<T>(key: string, aliases: string[] = [], zodSchema?: any): T | undefined {
    const strVal = getStringOption(key, aliases);
    if (!strVal) return undefined;
    try {
        const parsed = JSON.parse(strVal);
        if (zodSchema) {
            const validation = zodSchema.safeParse(parsed);
            if (!validation.success) {
                throw new Error(`Validation failed for option "${key}": ${validation.error}`);
            }
            return validation.data as T;
        }
        return parsed as T;
    } catch (err) {
        throw new Error(`Failed to parse JSON for option "${key}": ${(err as Error).message}`);
    }
}

function getStringOption(key: string, aliases: string[] = []): string | undefined {
    const keys = [key, ...aliases];
    for (const k of keys) {
        const val = rawArgs[k];
        if (typeof val === 'string') {
            return val;
        }
        if (Array.isArray(val) && val.length > 0) {
            return val[val.length - 1];
        }
    }
    return undefined;
}

function getBooleanOption(key: string, aliases: string[] = []): boolean {
    const keys = [key, ...aliases];
    for (const k of keys) {
        const val = rawArgs[k];
        if (val === true || val === 'true') return true;
        if (val === false || val === 'false') return false;
    }
    return false;
}

function printUsage() {
    console.log(`
Usage: tsx src/save-on-notion.ts [options]

General Options:
  -h, --help                  Show this help message.
  -f, --formats <list>          Comma-separated list of formats (e.g. DebatePortrait, TechPortraitVideo).
                                Valid formats: ${Object.values(Compositions).join(', ')}.
  -c, --channels <list>         Comma-separated list of channels (e.g. CodeStack, AlmaDeTerreiro).
                                Valid channels: ${Object.values(Channels).join(', ')}.
  -t, --topic <string>          Topic or title of the script (required).
      --base-script <string>    Base script in JSON format (required) -- must be a JSON with title and segments; segments must be an array of objects with "text" and "speaker" properties, and optionally "illustration" and "mediaSrc".
      --audio <path>            Audio file source (optional). -- Relative to public directory.
      --avatar-video <path>     Path to generated avatar video (optional). -- Relative to output directory.
      --generate-thumbnails     Whether to generate thumbnails for the script (optional, boolean).
      --generate-illustrations  Whether to generate illustrations for the script segments (optional, boolean).

Examples:
  # Save a new script
  tsx src/save-on-notion.ts --topic "How the DNS Works" --formats TechPortraitVideo --channels CodeStack --audio "dns_video_audio.mp3" --avatar-video "dns_avatar_video.mp4" --base-script '{"title": "How the DNS Works", "segments": [{"text": "The DNS is like the phonebook of the internet...", "speaker": "Narrator"}]}'
`);
}

const help = getBooleanOption('help', ['h']);
const formatsList = getArrayOption('formats', ['f']);
const channelsList = getArrayOption('channels', ['c']);
const topic = getStringOption('topic', ['t']);
const baseScript = getJsonOption<ScriptWithTitle>('base-script', ['base-script'], scriptWithTitleSchema);
const audioSrc = getStringOption('audio', ['audio']);
const avatarVideoSrc = getStringOption('avatar-video', ['avatar-video-src']);
const shouldGenerateThumbnails = getBooleanOption('generate-thumbnails', ['generate-thumbnails']);
const shouldGenerateIllustrations = getBooleanOption('generate-illustrations', ['generate-illustrations']);

if (help) {
    printUsage();
    process.exit(0);
}

const errors: string[] = [];

const validatedFormats: Compositions[] = [];
const validatedChannels: Channels[] = [];

if (!formatsList) {
    errors.push("Missing required argument: '--formats' (-f) is required in script mode.");
} else {
    const validCompositions = Object.values(Compositions);
    for (const format of formatsList) {
        if (!validCompositions.includes(format as Compositions)) {
            errors.push(`Invalid format: "${format}". Valid formats are: ${validCompositions.join(', ')}`);
        } else {
            validatedFormats.push(format as Compositions);
        }
    }
}

if (!channelsList) {
    errors.push("Missing required argument: '--channels' (-c) is required in script mode.");
} else {
    const validChannels = Object.values(Channels);
    for (const channel of channelsList) {
        if (!validChannels.includes(channel as Channels)) {
            errors.push(`Invalid channel: "${channel}". Valid channels are: ${validChannels.join(', ')}`);
        } else {
            validatedChannels.push(channel as Channels);
        }
    }
}

if (!topic?.trim()) {
    errors.push("Missing required argument: '--topic' (-t) is required in script mode.");
}

if (!baseScript) {
    errors.push("Missing required argument: '--base-script' is required in script mode.");
}

if (audioSrc) {
    const fullAudioPath = path.resolve(publicDir, audioSrc);
    if (!fs.existsSync(fullAudioPath)) {
        errors.push(`Audio file not found at path: "${fullAudioPath}"`);
    } else if (!fs.statSync(fullAudioPath).isFile()) {
        errors.push(`Audio path is not a file: "${fullAudioPath}"`);
    }
}

if (avatarVideoSrc) {
    const fullAvatarVideoPath = path.resolve(outputDir, avatarVideoSrc);
    if (!fs.existsSync(fullAvatarVideoPath)) {
        errors.push(`Avatar video file not found at path: "${fullAvatarVideoPath}"`);
    } else if (!fs.statSync(fullAvatarVideoPath).isFile()) {
        errors.push(`Avatar video path is not a file: "${fullAvatarVideoPath}"`);
    }
}


if (errors.length > 0) {
    console.error(`\x1b[31mError: CLI argument validation failed:\x1b[0m`);
    errors.forEach((err) => {
        console.error(`  - ${err}`);
    });
    console.log('\nUse --help or -h to see the available options and usage.');
    process.exit(1);
}

async function run() {
    try {
        const notionClient = new NotionClient();

        const script: ScriptWithTitle = {
            ...baseScript!,
            audio: [{ src: audioSrc! }], 
            channels: validatedChannels,
            compositions: validatedFormats,
        };

        let thumbnailsSrc: string[] | undefined;
        if (shouldGenerateThumbnails) {
            console.log(`Generating thumbnails for script "${baseScript?.title}"...`);
            thumbnailsSrc = await generateThumbnails({
                videoTitle: topic!,
                compositions: script.compositions!, 
                channels: script.channels!
            })
        }

        if (shouldGenerateIllustrations) {
            console.log(`Generating illustrations for script "${baseScript?.title}"...`);
            await Promise.all(
                script.segments.map(async (segment) => {
                    const mediaSrc = segment.illustration && await generateIllustration({ 
                        description: segment.illustration.description, 
                        type: segment.illustration.type,
                        context: segment.text
                    });
                    segment.mediaSrc = mediaSrc;
                })
            );
        }

        const scriptTextFile = saveScriptFile(script.segments, `${titleToFileName(script.title)}.txt`);

        await notionClient.saveScript({
            script,
            thumbnailsSrc,
            formats: script.compositions!,
            channels: script.channels!,
            scriptSrc: path.basename(scriptTextFile),
            avatarVideoSrc: avatarVideoSrc
        })
        console.log(`\x1b[32m✔ Script "${baseScript?.title}" saved successfully on Notion!\x1b[0m`);
    } catch (err: any) {
        console.error(`\x1b[31mError saving to Notion:\x1b[0m`, err);
        process.exit(1);
    }
}

run();
