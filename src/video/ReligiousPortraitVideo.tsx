import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/TitanOne";

import { videoSchema } from "../config/types";
import parseSentences from "./text-parser";
import Text from "./Text";
import { Video } from "@remotion/media";
import { getMimetypeFromFilename } from "../utils/get-mimetype-from-filename";
import { ImageWithBackground } from "./ImageWithBackground";

const { fontFamily } = loadFont();

export const ReligiousPortraitVideo: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, title, avatarVideoSrc }) => {
    const { fps, durationInFrames } = useVideoConfig()
  
    return (
        <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
            <Video
                src={staticFile(avatarVideoSrc!)}
                className="w-full h-full"
                style={{ objectFit: "cover" }}
            />
            
            {segments.map((segment, index) => {
                const { duration, alignment } = segment;
                
                const startFrame = index === 0 ? 0 : Math.max(0, segments.slice(0, index).reduce((acc, currentItem) => {
                    return acc + Math.ceil((currentItem.duration || 0) * fps);
                }, 0));

                const sentences = parseSentences(alignment)

                const durationFrames = index === segments.length - 1
                    ? durationInFrames - startFrame
                    : Math.ceil(duration * fps);

                return (
                <Sequence key={index} from={startFrame} durationInFrames={durationFrames}>
                    <AbsoluteFill>
                        {sentences.map((sentence, i) => {
                            return (
                            <Sequence
                                key={`${index}-${i}`}
                                from={Math.floor(sentence.start * fps)}
                                durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                            >
                                <AbsoluteFill className="absolute max-w-full max-h-1/4 top-[unset] right-[unset] bottom-1/3 left-[unset] p-16">
                                    <Text alignedWords={sentence.words} highlightColor="oklch(69.6% 0.17 162.48)" />
                                </AbsoluteFill>
                            </Sequence>
                            );
                        })}
                    </AbsoluteFill>

                    {segment.mediaSrc && (
                        <AbsoluteFill className="absolute max-w-full max-h-1/3 !top-[unset] !bottom-0 !right-[unset] !left-[unset] p-4">
                            {getMimetypeFromFilename(segment.mediaSrc).type === 'image' ? (
                                <ImageWithBackground src={staticFile(segment.mediaSrc)} />
                            ) : (
                                <Video
                                    src={staticFile(segment.mediaSrc)}
                                    muted
                                    loop
                                    className="w-full h-full object-contain"
                                    style={{ objectFit: "contain" }}
                                />
                            )}
                        </AbsoluteFill>
                    )}
                </Sequence>
                );
            })}
        </AbsoluteFill>
    );
};
