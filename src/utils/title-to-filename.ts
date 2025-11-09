import { v4 } from "uuid";

export const titleToFileName = (title: string) => {
    return (title || v4())
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50); // Limit to 50 characters
};