import { Gif } from "@remotion/gif";
import React from "react";
import {AbsoluteFill, staticFile, useVideoConfig} from "remotion";

export const TechTunnel: React.FC = () => {
  const {width, height} = useVideoConfig();

  return (
    <AbsoluteFill>
      <Gif
        src={staticFile("assets/tech-tunnel.gif")}
        fit="cover"
        width={width}
        height={height}
        loopBehavior="loop"
      />
      <AbsoluteFill
        className="pointer-events-none bg-stone-950/50"
        style={{
          mixBlendMode: "multiply",
        }}
      />
    </AbsoluteFill>
  )
};
