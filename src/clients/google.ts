import path from 'path'
import fs from 'fs'
import { customsearch_v1 as customSearch } from '@googleapis/customsearch';
import { SearcherClient } from './interfaces/Searcher';
import { ENV } from '../config/env';
import { v4 } from 'uuid';
import { publicDir } from '../config/path';

export class Google implements SearcherClient {
  private cse = new customSearch.Customsearch({
    auth: ENV.GOOGLE_SERP_API_KEY,
  });
  private key = ENV.GOOGLE_SERP_API_KEY!;
  private cx = ENV.GOOGLE_SERP_ID!;

  async searchImage(query: string, id?: string | number): Promise<{ mediaSrc?: string }> {
    if (!this.key || !this.cx) throw new Error('Missing GOOGLE_SERP_API_KEY or GOOGLE_SERP_ID');

    console.log(`[GOOGLE] Searching for: ${query}`);

    const { data } = await this.cse.cse.list({
      auth: this.key,
      cx: this.cx,
      q: query,
      num: 1,
      searchType: 'image',
      fileType: 'jpg,png',
      excludeTerms: 'site:pinterest.com, site:instagram.com, site:twitter.com, site:facebook.com',
    });

    if (!data.items) return { mediaSrc: undefined }
    if (!data.items[0].link) return { mediaSrc: undefined }

    const extension = data.items[0].fileFormat?.split('/').pop() || 'png'

    console.log(`[GOOGLE] Found image: ${data.items[0].link} with format ${extension}`);

    const filename = `image-${typeof id === 'undefined' ? v4() : id}.${extension}`;
    const file = await fetch(data.items[0].link)
    const buffer = await file.arrayBuffer()
    const dataBuffer = Buffer.from(buffer)

    fs.writeFileSync(path.resolve(publicDir, filename), dataBuffer)

    return {
        mediaSrc: filename
    }
  }
}
