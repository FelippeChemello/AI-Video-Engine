import fs from 'fs'
import path from 'path'

import { SocialMediaClient } from "./clients/interfaces/SocialMedia";
import { TiktokClient } from "./clients/tiktok";
import { outputDir } from './config/path';

const tiktok: SocialMediaClient = new TiktokClient()

const handle = process.argv[2]
if (!handle) {
    console.error("Please provide a social media handle as a command line argument.")
    process.exit(1);
}

fs.writeFileSync(path.resolve(outputDir, 'metrics.json'), JSON.stringify(await tiktok.getMetrics(handle), null, 2), 'utf-8')