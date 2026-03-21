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

export const ReligiousLandscape: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, audio }) => {
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

        const positions: ('left' | 'center-left' | 'center-right' | 'right')[] = ['left', 'center-left', 'center-right', 'right'];
        const position = positions[Math.floor(random(`${background.seed}-${index}`) * 4)];

        if (['right', 'center-right'].includes(position)) {
          return (
            <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
              {position === 'right' ? (
                <Img src={UmbadistaSide} className="absolute bottom-0 max-w-[40%] right-0 -scale-x-100" />
              ) : (
                <Img src={UmbadistaFront} className="absolute bottom-0 max-w-[35%] right-10" />
              )}

              {sentences.map((sentence, i) => {
                return (
                  <Sequence
                    key={`${index}-${i}`}
                    from={Math.ceil(sentence.start * fps)}
                    durationInFrames={Math.ceil((sentence.end - sentence.start) * fps)}
                  >
                    <AbsoluteFill className="absolute max-w-[60%] max-h-1/2 !bottom-0 !left-0 top-[unset] right-[unset] p-16">
                      <Text alignedWords={sentence.words} highlightColor="oklch(44.8% 0.119 151.328)" />
                    </AbsoluteFill>
                  </Sequence>
                );
              })}

              {segment.mediaSrc && (
                <AbsoluteFill className="absolute max-w-[60%] max-h-1/2 !top-0 !left-[0] p-8">
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
          )
        }

        return (
          <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
            {position === 'left' ? (
              <Img src={UmbadistaSide} className="absolute bottom-0 max-w-[40%] left-0" />
            ) : (
              <Img src={UmbadistaFront} className="absolute bottom-0 max-w-[35%] left-10" />
            )}

            {sentences.map((sentence, i) => {
              return (
                <Sequence
                  key={`${index}-${i}`}
                  from={Math.ceil(sentence.start * fps)}
                  durationInFrames={Math.ceil((sentence.end - sentence.start) * fps)}
                >
                  <AbsoluteFill className="absolute max-w-[60%] max-h-1/2 !bottom-0 !right-0 top-[unset] left-[unset] p-16">
                    <Text alignedWords={sentence.words} highlightColor="oklch(44.8% 0.119 151.328)" />
                  </AbsoluteFill>
                </Sequence>
              );
            })}

            {segment.mediaSrc && (
              <AbsoluteFill className="absolute max-w-[60%] max-h-1/2 !top-0 !right-0 !left-[unset] p-4">
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
        )
      })}
    </AbsoluteFill>
  );
};
