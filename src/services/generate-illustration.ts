import { Google } from "../clients/google";
import { CodeRendererClient } from "../clients/interfaces/CodeRenderer";
import { ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { Agent, LLMClient } from "../clients/interfaces/LLM";
import { MermaidRendererClient } from "../clients/interfaces/MermaidRenderer";
import { SearcherClient } from "../clients/interfaces/Searcher";
import { Mermaid } from "../clients/mermaid";
import { OpenAIClient } from "../clients/openai";
import { Shiki } from "../clients/shiki";
import { ScriptWithTitle } from "../config/types";

const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const mermaid: MermaidRendererClient = new Mermaid();
const shiki: CodeRendererClient = new Shiki();
const google: SearcherClient = new Google();

export async function generateIllustration(segment: ScriptWithTitle['segments'][0]): Promise<string | undefined> {
    if (!segment.illustration) return undefined;
    
    let mediaSrc: string | undefined;
        
    switch (segment.illustration.type) {
        case 'mermaid': 
            console.log('Generating mermaid')

            const { text: mermaidCode } = await openai.complete(Agent.MERMAID_GENERATOR, `Specification: ${segment.illustration.description} \n\nContext: ${segment.text}`);
            const exportedMermaid = await mermaid.exportMermaid(mermaidCode);

            mediaSrc = exportedMermaid.mediaSrc;
            break;

        case 'query': 
            console.log('Searching for image');

            const imageSearched = await google.searchImage(segment.illustration.description)
            
            mediaSrc = imageSearched.mediaSrc
            break;

        case 'code': 
            console.log('Generating code')

            const codeGenerated = await shiki.exportCode(segment.illustration.description);
            
            mediaSrc = codeGenerated.mediaSrc;
            break;

        case 'image_generation': 
        default: 
            console.log('Generating image');
            const mediaGenerated = await openai.generate({ prompt: segment.illustration.description });
            
            mediaSrc = mediaGenerated.mediaSrc;
            break;
    }

    return mediaSrc;
}