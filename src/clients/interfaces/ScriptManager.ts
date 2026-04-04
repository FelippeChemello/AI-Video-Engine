import path from "path";
import { BasicScript, Channels, Compositions, ScriptStatus, ScriptWithTitle, SEO, VideoBackground } from "../../config/types";
import { publicDir } from "../../config/path";

export type SaveScriptParams = {
    script: ScriptWithTitle;
    seo?: SEO;
    thumbnailsSrc?: Array<string>;
    formats?: Array<Compositions>;
    scriptSrc?: string;
    settings?: any;
    channels?: Array<Channels>;
    date?: Date;
};

export const channelAssetsMap: Record<Channels, null | { backgroundPaths: Array<string> }> = {
    [Channels.CODESTACK]: {
        backgroundPaths: [
            path.resolve(publicDir, 'assets', 'city-lights.gif'),
            path.resolve(publicDir, 'assets', 'tech-tunnel.gif'),
            path.resolve(publicDir, 'assets', 'wrinkled-paper.gif'),
        ]
    },
    [Channels.RED_FLAG_RADAR]: null,
    [Channels.ALMA_DE_TERREIRO]: {
        backgroundPaths: [
            path.resolve(publicDir, 'assets', 'river.gif'),
            path.resolve(publicDir, 'assets', 'river-2.gif'),
            path.resolve(publicDir, 'assets', 'river-3.gif'),
            path.resolve(publicDir, 'assets', 'river-4.gif'),
        ]
    }
}

export interface ScriptManagerClient {
    saveScript(script: SaveScriptParams): Promise<void>;
    setSEO(
        scriptId: string,
        seo: SEO,
    ): Promise<void>;
    retrieveScript(status: ScriptStatus, limit?: number): Promise<Array<ScriptWithTitle>>;
    updateScriptStatus(scriptId: string, status: ScriptStatus): Promise<void>;
    retrieveAssets(channel: Channels): Promise<{ background: VideoBackground }>;
    downloadAssets(script: ScriptWithTitle): Promise<ScriptWithTitle>;
    downloadOutputOfDoneScripts(): Promise<Array<string>>;
    saveOutput(scriptId: string, output: Array<string>): Promise<void>;
    retrieveLatestScripts(limit: number, composition?: Compositions): Promise<Array<BasicScript>>;
}