import { google } from 'googleapis'
import { parse as parseToHTML } from 'node-html-parser'

import { NewsletterFetcher, NewsletterSource, NewsletterSources } from "./interfaces/NewsletterFetcher";
import { ENV } from '../config/env';

export class GmailClient implements NewsletterFetcher {
    private auth = new google.auth.OAuth2(
        ENV.GOOGLE_CLIENT_ID,
        ENV.GOOGLE_CLIENT_SECRET,
    )
    
    private async authenticate() {
        this.auth.setCredentials({
            refresh_token: ENV.GMAIL_REFRESH_TOKEN,
        })

        const token = await this.auth.refreshAccessToken()

        this.auth.setCredentials(token.credentials)
    }

    async fetchContent(source: NewsletterSource): Promise<{ title: string; content: string; }> {
        console.log('[GMAIL] Authenticating with Gmail API')
        await this.authenticate();

        const client = google.gmail({ version: 'v1', auth: this.auth })

        const twelveHoursAgo = Math.floor((Date.now() - 12 * 60 * 60 * 1000) / 1000)
        console.log(`[GMAIL] Fetching email from sender: ${source} since ${new Date(twelveHoursAgo * 1000).toISOString()}`)
        
        const mailList = await client.users.messages.list({
            userId: 'me',
            q: `from:${source} after:${twelveHoursAgo}`,
            maxResults: 1,
        })

        if (!mailList.data.messages || mailList.data.messages.length === 0) {
            throw new Error(`[GMAIL] No emails found from sender: ${source}`);
        }

        const mailId = mailList.data.messages[0].id!;
        const mail = await client.users.messages.get({
            userId: 'me',
            id: mailId,
        })

        const parts = mail.data.payload?.parts;
        if (!parts || parts.length === 0) {
            throw new Error('[GMAIL] No content found in the email');
        }

        const title = mail.data.payload?.headers?.filter(header => header.name === 'Subject').map(header => header.value)[0] || 'No Subject';
        console.log(`[GMAIL] Fetched email with subject: ${title}`);

        const htmlPart = parts.find(part => part.mimeType === 'text/html');
        if (!htmlPart || !htmlPart.body || !htmlPart.body.data) {
            throw new Error('[GMAIL] No HTML content found in the email');
        }

        const content = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');

        const htmlContent = parseToHTML(content, { comment: false, blockTextElements: { script: false, noscript: false, style: false, pre: false } });

        return { title, content: NewsletterSources[source].parser(htmlContent) };
    }
}