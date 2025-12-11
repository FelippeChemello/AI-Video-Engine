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
import { Speaker } from "../clients/interfaces/TTS";

const { fontFamily } = loadFont();

export const DebateLandscape: React.FC<z.infer<typeof videoSchema>> = ({ segments, background, audio, settings }) => {
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: background.color, fontFamily }}>
      {segments.map((segment, index, segments) => {
        const { duration, alignment, speaker } = segment;
        const start = segments.slice(0, index).reduce((acc, currentItem) => {
          return acc + (currentItem.duration || 0);
        }, 0);
        const mediaType = segment.mediaSrc && getMimetypeFromFilename(segment.mediaSrc).type;
        
        const sentences = parseSentences(alignment)

        const isConclusion = index === segments.length - 2 && segment.speaker === Speaker.Narrator;
        const isFinale = index === segments.length - 1 && segment.speaker === Speaker.Narrator;

        if (isConclusion || isFinale) {
          return (
            <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
              {settings?.winner ? (
                <>
                  <AbsoluteFill className="flex justify-center items-center z-10 h-2/3">
                    <VisualizeAudio
                      audioSrc={staticFile(audio[index].src)}
                      speaker={settings.winner ? settings.winner : Speaker.Narrator}
                      size={384}
                      muted={settings.winner ? settings.winner !== speaker : false}
                      winner={settings.winner ? settings.winner : Speaker.Narrator}
                    />
                  </AbsoluteFill>
                  
                  <AbsoluteFill className="flex flex-row justify-evenly items-center pb-16 top-[unset] h-1/3">
                    <div className="w-[30%] h-1/3 pl-16 flex justify-center items-center">
                      <VisualizeAudio
                        audioSrc={staticFile(audio[index].src)}
                        speaker={Speaker.Narrator}
                        size={256}
                      />
                    </div>

                    {sentences.map((sentence, i) => {
                      return (
                        <Sequence
                          key={`${index}-${i}`}
                          from={Math.floor(sentence.start * fps)}
                          durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                          className="w-[70%] h-full pr-16 !relative"
                        >
                          <Text alignedWords={sentence.words} highlightColor={speakerMap[speaker].color} />
                        </Sequence>
                      )
                    })}
                  </AbsoluteFill>
                </>
              ) : (
                <AbsoluteFill className="flex flex-col justify-evenly items-center pb-16 top-[unset]">
                  <div className="w-[30%] h-1/3 pl-16 flex justify-center items-center">
                    <VisualizeAudio
                      audioSrc={staticFile(audio[index].src)}
                      speaker={Speaker.Narrator}
                      size={256}
                    />
                  </div>

                  {sentences.map((sentence, i) => {
                    return (
                      <Sequence
                        key={`${index}-${i}`}
                        from={Math.floor(sentence.start * fps)}
                        durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                        className="w-[100%] h-1/3 px-16 !relative"
                      >
                        <Text alignedWords={sentence.words} highlightColor={speakerMap[speaker].color} />
                      </Sequence>
                    )
                  })}
                </AbsoluteFill>
              )}
            </Sequence>
          )
        }

        return (
          <Sequence key={index} from={Math.floor(start * fps)} durationInFrames={Math.ceil(duration * fps)}>
            <AbsoluteFill className="z-20">
              {sentences.map((sentence, i) => {
                return (
                  <Sequence
                    key={`${index}-${i}`}
                    from={Math.floor(sentence.start * fps)}
                    durationInFrames={Math.floor((sentence.end - sentence.start) * fps)}
                  >
                    <AbsoluteFill className="max-w-[85%] max-h-1/3 bottom-0 right-0 left-[unset] top-[unset] px-16 py-8">
                      <Text alignedWords={sentence.words} highlightColor={speakerMap[speaker].color} />
                    </AbsoluteFill>
                  </Sequence>
                )
              })}
            </AbsoluteFill>

            {segment.mediaSrc && (
              <AbsoluteFill className="absolute max-w-[75%] max-h-2/3 !top-0 !right-0 !left-[unset] p-8">
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

            <AbsoluteFill className="mx-16 justify-evenly w-fit">
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={Speaker.ChatGPT}
                muted={speaker !== Speaker.ChatGPT}
                size={128}
              />
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={Speaker.Claude}
                muted={speaker !== Speaker.Claude}
                size={128}
              />
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={Speaker.Narrator}
                muted={speaker !== Speaker.Narrator}
                size={128}
              />
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={Speaker.Grok}
                muted={speaker !== Speaker.Grok}
                size={128}
              />
              <VisualizeAudio
                audioSrc={staticFile(audio[index].src)}
                speaker={Speaker.Gemini}
                muted={speaker !== Speaker.Gemini}
                size={128}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
