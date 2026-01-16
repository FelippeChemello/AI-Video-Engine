import "./index.css";

import { Composition, random, staticFile } from "remotion";
import { v4 } from "uuid";
import { z } from "zod";

import { Landscape } from "./Landscape";
import { videoSchema } from "../config/types";
import { Portrait } from "./Portrait";
import { DebatePortrait } from "./DebatePortrait";
import { DebateLandscape } from "./DebateLandscape";
import { Tinder } from "./Tinder";

const FPS = 30;

const defaultProps: z.infer<typeof videoSchema> = {
  audio: [],
  segments: [],
  background: {
    color: "oklch(70.8% 0 0)",
    mainColor: "oklch(68.5% 0.169 237.323)",
    secondaryColor: "oklch(29.3% 0.066 243.157)",
    seed: v4(),
  }
};

async function calculateMetadata({ props }: { props: z.infer<typeof videoSchema> }) {
  const duration = props.audio.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  
  if (props.background.video?.src && !props.background.video.initTime) {
    const video = await fetch(staticFile(props.background.video.src)).then((res) => res.blob());
    const videoDuration = await new Promise<number>((resolve) => {
      const videoElement = document.createElement("video");
      videoElement.src = URL.createObjectURL(video);
      videoElement.onloadedmetadata = () => {
        resolve(videoElement.duration);
      };
    });

    const videoNeedsToBeginAtMax = Math.max(0, videoDuration - duration);
    const randomOffset = random(props.background.seed) * videoNeedsToBeginAtMax;
    props.background.video.initTime = randomOffset;
  }

  let pos = 0;
  const segments = props.audio.length > 1 
    ? props.segments.map((segment, segmentIndex) => {
      const tokens = segment.text.replace(/<\/?[^>]+(>|$)/g, "").trim().split(/\s+/);
      
      const duration = props.audio[segmentIndex]?.duration ?? 0
      const segmentAlignment = props.audio[segmentIndex]?.alignment ?? []

      pos += tokens.length;

      return {
        ...segment,
        duration: duration,
        alignment: segmentAlignment,
      }
    })
    : props.segments.map((segment) => {
      const tokens = segment.text.replace(/<\/?[^>]+(>|$)/g, "").trim().split(/\s+/);
      
      const duration = (props.audio[0].alignment?.[pos + tokens.length - 1]?.end || 0) - (props.audio[0].alignment?.[pos]?.start || 0)
      const segmentAlignment = props.audio[0]?.alignment?.slice(pos, pos + tokens.length) || []

      pos += tokens.length;

      return {
        ...segment,
        duration: duration,
        alignment: segmentAlignment,
      }
    })

  return {
    durationInFrames: Math.max(1, Math.ceil(duration * FPS)),
    props: {
      ...props,
      segments
    }
  };
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Landscape"
        component={Landscape}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
        schema={videoSchema}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="Portrait"
        component={Portrait}
        durationInFrames={1}
        fps={FPS}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="DebatePortrait"
        component={DebatePortrait}
        durationInFrames={1}
        fps={FPS}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="DebateLandscape"
        component={DebateLandscape}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
        schema={videoSchema}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
      <Composition
        id="TinderRoastPortrait"
        component={Tinder}
        durationInFrames={1}
        fps={FPS}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
