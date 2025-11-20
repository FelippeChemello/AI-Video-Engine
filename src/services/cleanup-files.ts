import fs from "fs";

export function cleanupFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
        try {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }
}