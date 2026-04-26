import { CodexClient } from "../clients/codex";
import { GeminiClient } from "../clients/gemini";
import { Google } from "../clients/google";
import { CodeRendererClient } from "../clients/interfaces/CodeRenderer";
import { ImageGeneratorClient } from "../clients/interfaces/ImageGenerator";
import { Agent, LLMClient } from "../clients/interfaces/LLM";
import { MermaidRendererClient } from "../clients/interfaces/MermaidRenderer";
import { SearcherClient } from "../clients/interfaces/Searcher";
import { Mermaid } from "../clients/mermaid";
import { OpenAIClient } from "../clients/openai";
import { Shiki } from "../clients/shiki";
import { sanitizeText } from "../utils/sanitize-text";

const openai: LLMClient & ImageGeneratorClient = new OpenAIClient();
const gemini: ImageGeneratorClient = new GeminiClient();
const codex: LLMClient & ImageGeneratorClient = new CodexClient();
const mermaid: MermaidRendererClient = new Mermaid();
const shiki: CodeRendererClient = new Shiki();
const google: SearcherClient = new Google();

const imageGenerationEngines: Array<ImageGeneratorClient> = [codex, gemini, openai];

type IllustrationRequest = {
    type: "mermaid" | "query" | "code" | "image_generation";
    description: string;
    context?: string;
    imageSrc?: string; // Optional base image source for image generation
}

export async function generateIllustration({
    type,
    description,
    context = "No additional context provided.",
    imageSrc
}: IllustrationRequest): Promise<string | undefined> {
    let mediaSrc: string | undefined;
    try {
        switch (type) {
            case "mermaid":
                console.log("Generating mermaid");

                const mermaidCode = await openai.complete(
                    Agent.MERMAID_GENERATOR,
                    `Specification: ${description} \n\nContext: ${sanitizeText(context)}`,
                );
                const exportedMermaid = await mermaid
                    .exportMermaid(mermaidCode.mermaid)
                    .catch((err) => {
                        console.error("Error exporting mermaid:", err);
                        return { mediaSrc: undefined };
                    });

                mediaSrc = exportedMermaid.mediaSrc;
                break;

            case "query":
                console.log("Searching for image");

                const imageSearched = await google.searchImage(description);

                mediaSrc = imageSearched.mediaSrc;
                break;

            case "code":
                console.log("Generating code");

                const codeGenerated = await shiki.exportCode(description);

                mediaSrc = codeGenerated.mediaSrc;
                break;

            case "image_generation":
            default:
                console.log("Generating image");
                for (const engine of imageGenerationEngines) {
                    try {
                        const result = await engine.generate({ prompt: description, baseImageSrc: imageSrc });
                        if (result.mediaSrc) {
                            mediaSrc = result.mediaSrc;
                            console.log(
                                `Image generated successfully with ${engine.constructor.name}`,
                            );
                            break;
                        }
                    } catch (error) {
                        console.error(
                            `Error generating image with ${engine.constructor.name}:`,
                            error,
                        );
                    }
                }
                
                break;
        }
    } catch (error) {
        console.error("Error generating illustration:", error);
        mediaSrc = undefined;
    }

    return mediaSrc;
}
