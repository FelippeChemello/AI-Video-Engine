import "./index.css";

import { Composition, random, staticFile } from "remotion";

import { Landscape } from "./Landscape";
import { videoSchema } from "../config/types";
import { Portrait } from "./Portrait";
import { FallingBalls, fallingBallsSchema } from "./FallingBalls";
import { v4 } from "uuid";
import { WrinkledPaper } from "./WrinkledPaper";

const FPS = 30;

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
        defaultProps={{
          audioSrc: '',
          segments: [],
          alignment: [],
          duration: 1,
          background: {
            color: "oklch(70.8% 0 0)",
            mainColor: "oklch(68.5% 0.169 237.323)",
            secondaryColor: "oklch(29.3% 0.066 243.157)",
            seed: v4(),
            video: {
              src: "assets/parkour.mp4",
            }
          }
        }}
        calculateMetadata={async ({ props }) => {
          if (props.background.video?.src && !props.background.video.initTime) {
            const video = await fetch(staticFile(props.background.video.src)).then((res) => res.blob());
            const videoDuration = await new Promise<number>((resolve) => {
              const videoElement = document.createElement("video");
              videoElement.src = URL.createObjectURL(video);
              videoElement.onloadedmetadata = () => {
                resolve(videoElement.duration);
              };
            });

            const videoNeedsToBeginAtMax = Math.max(0, videoDuration - props.duration);
            const randomOffset = random(props.background.seed) * videoNeedsToBeginAtMax;
            props.background.video.initTime = randomOffset;
          }

          let pos = 0;
          const segments = props.segments.map((segment) => {
            const tokens = segment.text.replace(/<\/?[^>]+(>|$)/g, "").trim().split(/\s+/);
            
            const duration = props.alignment[pos + tokens.length - 1].end - props.alignment[pos].start;
            const segmentAlignment = props.alignment.slice(pos, pos + tokens.length);

            pos += tokens.length;

            return {
              ...segment,
              duration: duration,
              alignment: segmentAlignment,
            }
          })

          return {
            durationInFrames: Math.ceil(props.duration * FPS),
            props: {
              ...props,
              segments
            }
          };
        }}
      />
      <Composition
        id="Portrait"
        component={Portrait}
        durationInFrames={1}
        fps={FPS}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          audioSrc: '',
          segments: [],
          alignment: [],
          duration: 1,
          background: {
            color: "oklch(70.8% 0 0)",
            mainColor: "oklch(68.5% 0.169 237.323)",
            secondaryColor: "oklch(29.3% 0.066 243.157)",
            seed: v4(),
            video: {
              src: "assets/parkour.mp4",
            }
          }
        }}
        calculateMetadata={async ({ props }) => {
          if (props.background.video?.src && !props.background.video.initTime) {
            const video = await fetch(staticFile(props.background.video.src)).then((res) => res.blob());
            const videoDuration = await new Promise<number>((resolve) => {
              const videoElement = document.createElement("video");
              videoElement.src = URL.createObjectURL(video);
              videoElement.onloadedmetadata = () => {
                resolve(videoElement.duration);
              };
            });

            const videoNeedsToBeginAtMax = Math.max(0, videoDuration - props.duration);
            const randomOffset = random(props.background.seed) * videoNeedsToBeginAtMax;
            props.background.video.initTime = randomOffset;
          }

          let pos = 0;
          const segments = props.segments.map((segment) => {
            const tokens = segment.text.replace(/<\/?[^>]+(>|$)/g, "").trim().split(/\s+/);
            
            const duration = props.alignment[pos + tokens.length - 1].end - props.alignment[pos].start;
            const segmentAlignment = props.alignment.slice(pos, pos + tokens.length);

            pos += tokens.length;

            return {
              ...segment,
              duration: duration,
              alignment: segmentAlignment,
            }
          })

          return {
            durationInFrames: Math.ceil(props.duration * FPS),
            props: {
              ...props,
              segments
            }
          };
        }}
      />
      <Composition
        id="FallingBalls"
        component={FallingBalls}
        durationInFrames={3000}
        fps={FPS}
        width={1920}
        height={1080}
        schema={fallingBallsSchema}
        defaultProps={{
          backgroundColor: "oklch(21% 0.006 285.885)",
          obstacleColor: "oklch(70.8% 0 0)",
          ballColor: "oklch(68.5% 0.169 237.323)",
          seed: v4(),
        }}
      />
      <Composition
        id="WrinkledPaper"
        component={WrinkledPaper}
        durationInFrames={3000}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
