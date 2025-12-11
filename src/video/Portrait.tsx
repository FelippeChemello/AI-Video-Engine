import {
  AbsoluteFill,
  Img,
  random,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video, Audio } from '@remotion/media'
import { useMemo } from "react";
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/TitanOne";

import { videoSchema, Viseme } from "../config/types";
import { Felippe } from './Felippe'
import CodyImg from "../../public/assets/cody.png";
import parseSentences from "./text-parser";
import Text from "./Text";
import { getMimetypeFromFilename } from "../utils/get-mimetype-from-filename";
import { LoopableOffthreadVideo } from "./LoopableOffthreadVideo";
import { ImageWithBackground } from "./ImageWithBackground";
import { TechTunnel } from "./TechTunnel";
import { Speaker } from "../clients/interfaces/TTS";

const { fontFamily } = loadFont();

export const Portrait: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, audio }) => {
  const { fps, durationInFrames } = useVideoConfig()
  const frame = useCurrentFrame();

  const blink = useMemo(() => {
    const starts: number[] = [];
    let f = Math.floor(2 * fps);
    let i = 0;

    while (f < durationInFrames) {
      const interval = 2 + random(`blink-${background.seed}-${i}`) * 3;
      starts.push(f);
      f += Math.floor(interval * fps);
      i++;
    }

    return starts;
  }, [background.seed, durationInFrames, fps]);

  const isBlinking = blink.some(s => frame >= s && frame < s + 3)

  return (
    <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
      {background.video?.src ? (
        <Video
          src={staticFile(background.video.src)} 
          muted 
          trimBefore={(background.video.initTime || 0) * fps}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loop
        />
      ) : <TechTunnel />}
      

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
        const { duration, alignment, speaker } = segment;
        const start = segments.slice(0, index).reduce((acc, currentItem) => {
          return acc + (currentItem.duration || 0);
        }, 0);
        const mediaType = segment.mediaSrc && getMimetypeFromFilename(segment.mediaSrc).type;
        
        const { viseme }  = audio[index]?.visemes?.find(v => v.start * fps <= frame && v.end * fps > frame) || { viseme: undefined };

        const sentences = parseSentences(alignment)

        return (
          <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
            {speaker === Speaker.Felippe && (
              <AbsoluteFill>
                <Felippe 
                  className="w-[50%] h-auto absolute bottom-0 right-0 aspect-auto"
                  eyesOpen={!isBlinking}
                  mouth={viseme as Viseme}
                />

                {sentences.map((sentence, i) => {
                  return (
                    <Sequence
                      key={`${index}-${i}`}
                      from={Math.floor(sentence.start * fps)}
                      durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                    >
                      <AbsoluteFill className="absolute max-w-full max-h-1/3 bottom-[unset] right-[unset] top-1/3 left-[unset] p-16">
                        <Text alignedWords={sentence.words} highlightColor="oklch(68.5% 0.169 237.323)" />
                      </AbsoluteFill>
                    </Sequence>
                  );
                })}
              </AbsoluteFill>
            )}

            {speaker === Speaker.Cody && (
              <AbsoluteFill>
                <Img src={CodyImg} className="absolute bottom-0 left-0 max-w-[50%]" /> 

                {sentences.map((sentence, i) => {
                  return (
                    <Sequence
                      key={`${index}-${i}`}
                      from={Math.floor(sentence.start * fps)}
                      durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                    >
                      <AbsoluteFill className="absolute max-w-full max-h-1/3 bottom-[unset] right-[unset] top-1/3 left-[unset] p-16">
                        <Text alignedWords={sentence.words} highlightColor="oklch(76.9% 0.188 70.08)"/>
                      </AbsoluteFill>
                    </Sequence>
                  )
                })}
              </AbsoluteFill>
            )}

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
