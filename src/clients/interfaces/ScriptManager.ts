import { BasicScript, Channels, Compositions, ScriptStatus, ScriptWithTitle, SEO, VideoBackground } from "../../config/types";

export type SaveScriptParams = {
    script: ScriptWithTitle;
    seo?: SEO;
    thumbnailsSrc?: Array<string>;
    formats?: Array<Compositions>;
    scriptSrc?: string;
    settings?: any;
    channels?: Array<Channels>
};

export interface ScriptManagerClient {
    saveScript(script: SaveScriptParams): Promise<void>;
    setSEO(
        scriptId: string,
        seo: SEO,
    ): Promise<void>;
    retrieveScript(status: ScriptStatus, limit?: number): Promise<Array<ScriptWithTitle>>;
    updateScriptStatus(scriptId: string, status: ScriptStatus): Promise<void>;
    retrieveAssets(scriptId: string): Promise<{ background: VideoBackground }>;
    downloadAssets(script: ScriptWithTitle): Promise<ScriptWithTitle>;
    downloadOutputOfDoneScripts(): Promise<Array<string>>;
    saveOutput(scriptId: string, output: Array<string>): Promise<void>;
    retrieveLatestScripts(limit: number): Promise<Array<BasicScript>>;
}