export function sanitizeText(text: string): string {
    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');
    // Remove content within square brackets
    sanitized = sanitized.replace(/\[.*?\]/g, '');
    // Trim extra whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    return sanitized;
}