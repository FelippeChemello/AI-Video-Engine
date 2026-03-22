import {
  AbsoluteFill,
  Img,
  random,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Audio } from '@remotion/media'
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/TitanOne";

import { videoSchema } from "../config/types";
import UmbadistaFront from "../../public/assets/umbandista.png";
import UmbadistaSide from "../../public/assets/umbandista-side.png";
import parseSentences from "./text-parser";
import Text from "./Text";
import { getMimetypeFromFilename } from "../utils/get-mimetype-from-filename";
import { LoopableOffthreadVideo } from "./LoopableOffthreadVideo";
import { ImageWithBackground } from "./ImageWithBackground";
import { Background } from "./Background";

const { fontFamily } = loadFont();

export const ReligiousPortrait: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, audio }) => {
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
      <Background {...background} />      

      {audio.map((audio, audioIndex, audios) => (
        <Sequence 
          key={audioIndex} 
          from={audioIndex === 0 ? 0 : audios.slice(0, audioIndex).reduce((acc, a) => { return acc + a.duration! }, 0) * fps} 
          durationInFrames={(audio.duration || 0) * fps}
        >
          <Audio src={staticFile(audio.src)} />
        </Sequence>
      ))}

      {segments.map((segment, index) => {
        const { duration, alignment } = segment;
        const start = segments.slice(0, index).reduce((acc, currentItem) => {
          return acc + (currentItem.duration || 0);
        }, 0);
        const mediaType = segment.mediaSrc && getMimetypeFromFilename(segment.mediaSrc).type;
        
        const sentences = parseSentences(alignment)

        const positions: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];
        const position = positions[Math.floor(random(`${background.seed}-${index}`) * 3)];

        return (
          <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
            {position === 'center' ?
              <Img src={UmbadistaFront} className="absolute bottom-0 max-w-[50%] left-1/2 -translate-x-1/2" />
              : position === 'right' ?
                <Img src={UmbadistaSide} className="absolute bottom-0 max-w-[50%] right-0 -scale-x-100" />
                : <Img src={UmbadistaSide} className="absolute bottom-0 max-w-[50%] left-0" />
            }

            <AbsoluteFill>
              {sentences.map((sentence, i) => {
                return (
                  <Sequence
                    key={`${index}-${i}`}
                    from={Math.floor(sentence.start * fps)}
                    durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                  >
                    <AbsoluteFill className="absolute max-w-full max-h-1/3 bottom-[unset] right-[unset] top-1/3 left-[unset] p-16">
                      <Text alignedWords={sentence.words} highlightColor="oklch(44.8% 0.119 151.328)" />
                    </AbsoluteFill>
                  </Sequence>
                );
              })}
            </AbsoluteFill>

            {segment.mediaSrc && (
              <AbsoluteFill className="absolute max-w-full max-h-1/3 !top-0 !right-[unset] !left-[unset] p-4">
                {mediaType === 'image' ? (
                  <ImageWithBackground src={staticFile(segment.mediaSrc)} />
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
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
