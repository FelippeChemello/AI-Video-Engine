import fs from 'fs'
import path from 'path'

import { SocialMediaClient } from "./clients/interfaces/SocialMedia";
import { TiktokClient } from "./clients/tiktok";
import { Youtube } from './clients/youtube';
import { outputDir } from './config/path';

const clients: Record<string, SocialMediaClient> = {
    tiktok: new TiktokClient(),
    youtube: new Youtube(),
}

const firstArg = process.argv[2]
const secondArg = process.argv[3]
const provider = secondArg ? firstArg : 'tiktok'
const handle = secondArg ?? firstArg

if (!provider || !(provider in clients)) {
    console.error(`Please provide a supported provider: ${Object.keys(clients).join(', ')}.`)
    process.exit(1);
}

if (!handle) {
    console.error("Please provide a social media handle as a command line argument.")
    process.exit(1);
}

fs.writeFileSync(path.resolve(outputDir, 'metrics.json'), JSON.stringify(await clients[provider].getMetrics(handle), null, 2), 'utf-8')
