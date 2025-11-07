import { HTMLElement } from 'node-html-parser';

export enum NewsletterSource {
    FILIPE_DESCHAMPS = 'newsletter@filipedeschamps.com.br'
}

export const NewsletterSources: {
    [key in NewsletterSource]: {
        parser: (html: HTMLElement) => string;
    }
} = {
    [NewsletterSource.FILIPE_DESCHAMPS]: {
        parser: (html: HTMLElement) => {
            const paragraphs = Object.values(html.querySelectorAll('tbody p')).map(p => p.textContent?.trim()).filter(Boolean);

            const paragraphsWithoutIntroAndLinks = paragraphs.slice(1).filter(p => p?.indexOf('<a href') === -1);

            return paragraphsWithoutIntroAndLinks.join('\n\n');
        }
    }
};

export interface NewsletterFetcher {
    fetchContent(source: NewsletterSource): Promise<{ title: string; content: string }>;
}