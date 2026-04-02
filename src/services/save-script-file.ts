import path from "path";
import fs from "fs";

import { outputDir } from "../config/path";
import { ScriptWithTitle } from "../config/types";

export function saveScriptFile(
    segments: ScriptWithTitle["segments"],
    filename: string,
) {
    const scriptTextFile = path.join(outputDir, filename);
    fs.writeFileSync(
        scriptTextFile,
        segments.map((s) => `${s.speaker}: ${s.text}`).join("\n"),
        "utf-8",
    );
    return scriptTextFile;
}
