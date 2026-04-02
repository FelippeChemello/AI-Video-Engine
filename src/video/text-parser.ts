import { sanitizeText } from "../utils/sanitize-text";

type Word = { text: string; start: number; end: number };
type Sentence = { start: number; end: number; text: string; words: Word[] };

export default function parseSentences(tokens: Word[]) {
    if (!tokens.length) return [];

    const offset = tokens[0].start;
    const rel = tokens.map((t) => ({
        ...t,
        start: t.start - offset,
        end: t.end - offset,
    }));
    const out: Sentence[] = [];

    let cur: Word[] = [];
    for (const w of rel) {
        cur.push(w);
        if (/[.!?]$/.test(sanitizeText(w.text))) {
            const s = cur[0].start;
            const e = cur[cur.length - 1].end;
            out.push({
                start: s,
                end: e,
                text: cur.map((t) => sanitizeText(t.text)).join(" "),
                words: cur.map((t) => ({
                    ...t,
                    text: sanitizeText(t.text),
                    start: t.start - s,
                    end: t.end - s,
                })),
            });
            cur = [];
        }
    }

    if (cur.length) {
        const s = cur[0].start;
        const e = cur[cur.length - 1].end;
        out.push({
            start: s,
            end: e,
            text: cur.map((t) => sanitizeText(t.text)).join(" "),
            words: cur.map((t) => ({
                ...t,
                text: sanitizeText(t.text),
                start: t.start - s,
                end: t.end - s,
            })),
        });
    }
    return out;
}
