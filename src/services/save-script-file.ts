import path from "path";
import fs from "fs";

import { outputDir } from "../config/path";
import { ScriptWithTitle } from "../config/types";

export function saveScriptFile(segments: ScriptWithTitle['segments'], filename: string) {
    const scriptTextFile = path.join(outputDir, filename);
    fs.writeFileSync(scriptTextFile, `
Read aloud this conversation between Felippe and his dog Cody. Cody has a curious and playful personality with an animated character like voice, while Felippe is knowledgeable and enthusiastic.
Felippe is known for his vast knowledge, and Cody is a curious dog who is always asking questions about the world, both are Brazilian Portuguese speakers and have a super very fast-paced, energetic, and enthusiastic way of speaking.
    
${segments.map((s) => `${s.speaker}: ${s.text}`).join('\n')}`, 'utf-8');
    return scriptTextFile;
}