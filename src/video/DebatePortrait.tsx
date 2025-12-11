import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/TitanOne";

import { videoSchema } from "../config/types";
import parseSentences from "./text-parser";
import Text from "./Text";
import { getMimetypeFromFilename } from "../utils/get-mimetype-from-filename";
import { LoopableOffthreadVideo } from "./LoopableOffthreadVideo";
import { speakerMap, VisualizeAudio } from "./VisualizeAudio";

const { fontFamily } = loadFont();

export const DebatePortrait: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, audio }) => {
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
      {segments.map((segment, index) => {
        const { duration, alignment, speaker } = segment;
        const start = segments.slice(0, index).reduce((acc, currentItem) => {
          return acc + (currentItem.duration || 0);
        }, 0);
        const mediaType = segment.mediaSrc && getMimetypeFromFilename(segment.mediaSrc).type;
        
        const sentences = parseSentences(alignment)

        return (
          <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
            <AbsoluteFill>
              {sentences.map((sentence, i) => {
                return (
                  <Sequence
                    key={`${index}-${i}`}
                    from={Math.floor(sentence.start * fps)}
                    durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                  >
                    <AbsoluteFill className="absolute max-w-full max-h-1/3 bottom-[unset] right-[unset] top-1/3 left-[unset] p-16">
                      <Text alignedWords={sentence.words} highlightColor={speakerMap[speaker].color} />
                    </AbsoluteFill>
                  </Sequence>
                )
              })}
            </AbsoluteFill>

            {segment.mediaSrc && (
              <AbsoluteFill className="absolute max-w-full max-h-1/3 !top-0 !right-[unset] !left-[unset] p-4">
                {mediaType === 'image' ? (
                  <Img src={staticFile(segment.mediaSrc)} className="w-full h-full object-contain" />
                ) : (
                  <LoopableOffthreadVideo
                    src={staticFile(segment.mediaSrc)}
                    muted
                    loop
                    className="w-full h-full object-contain"
                  />
                )}
              </AbsoluteFill>
            )}

            <AbsoluteFill className="w-fit h-fit pointer-events-none bottom-72 top-[unset] mx-auto">
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={speaker}
                size={256}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
