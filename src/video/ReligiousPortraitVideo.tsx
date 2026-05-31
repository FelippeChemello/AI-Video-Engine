import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/TitanOne";

import { videoSchema } from "../config/types";
import parseSentences from "./text-parser";
import Text from "./Text";
import { Video } from "@remotion/media";
import { useMemo } from "react";

const { fontFamily } = loadFont();

const START_OFFSET = 1; // Number of frames to overlap between segments

export const ReligiousPortraitVideo: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, title, avatarVideoSrc }) => {
  const { fps, durationInFrames } = useVideoConfig()
  const frame = useCurrentFrame();

  const isSingleAvatarVideo = useMemo(() => avatarVideoSrc && segments.every(segment => !segment.mediaSrc), [avatarVideoSrc, segments]);

  const contentDurationInFrames = segments.reduce((acc, segment) => {
    return acc + Math.ceil((segment.duration || 0) * fps) - START_OFFSET;
  }, 0);

  const isFrameBeyondContent = frame >= contentDurationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
      {isSingleAvatarVideo && (
        <Video
          src={staticFile(avatarVideoSrc!)}
          className="w-full h-full"
          style={{ objectFit: "cover" }}
        />
      )}
      
      {segments.map((segment, index) => {
        const { duration, alignment } = segment;
        
        const startFrame = index === 0 ? 0 : Math.max(0, segments.slice(0, index).reduce((acc, currentItem) => {
          return acc + Math.ceil((currentItem.duration || 0) * fps) - START_OFFSET;
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
                    <AbsoluteFill className="absolute max-w-full max-h-1/4 bottom-[unset] right-[unset] top-3/5 left-[unset] p-16">
                      <Text alignedWords={sentence.words} highlightColor="oklch(44.8% 0.119 151.328)" />
                    </AbsoluteFill>
                  </Sequence>
                );
              })}
            </AbsoluteFill>

            {!isSingleAvatarVideo && (<Video
                src={staticFile(segment.mediaSrc!)}
                className="w-full h-full"
                style={{ objectFit: "cover" }}
            />)}
          </Sequence>
        );
      })}

      {isFrameBeyondContent && (
        <AbsoluteFill className="items-center justify-center">
          <Text 
            alignedWords={parseSentences([{ text: title, start: 0, end: contentDurationInFrames / fps }])[0].words} 
            highlightColor="oklch(44.8% 0.119 151.328)" 
        />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
