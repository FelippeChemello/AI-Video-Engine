import { useVideoConfig, useCurrentFrame, staticFile, Img } from "remotion";
import { Audio } from '@remotion/media';
import { useAudioData, visualizeAudioWaveform } from '@remotion/media-utils'

import { Speaker } from "../clients/interfaces/TTS";

export const speakerMap: Record<Speaker, { color: string, icon: string }> = {
  Felippe: { color: "#00a6f4", icon: "assets/felippe.png" },
  Cody: { color: "#fd9a00", icon: "assets/cody.png" },
  ChatGPT: { color: "#74AA9C", icon: "assets/chatgpt.png" },
  Claude: { color: "#C15F3C", icon: "assets/claude.png" },
  Gemini: { color: "#4285f4", icon: "assets/gemini.png" },
  Grok: { color: "#2f0d68", icon: "assets/grok.png" },
  Narrator: { color: "#00a6f4", icon: "assets/felippe.png" },
}

export const VisualizeAudio: React.FC<{
  audioSrc: string
  speaker: Speaker
  size: number
  muted?: boolean
  winner?: boolean
}> = ({
  audioSrc,
  speaker,
  size,
  muted = false,
  winner = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(audioSrc);

  if (!audioData) {
    return null;
  }

  const speakerInfo = speakerMap[speaker];
  const visualization = !muted 
    ? visualizeAudioWaveform({ audioData, frame, fps, numberOfSamples: size, windowInSeconds: 1 / fps })
    : [...Array(size).fill(0)];

  return (
    <>
      <Audio src={audioSrc} muted={muted} />
      
      <div 
        className="relative flex items-center justify-center overflow-visible bg-transparent"
        style={{ width: size, height: size }}
      >
        <div 
          className="size-full object-cover z-10 bg-stone-50 rounded-full overflow-hidden"
          style={{
            padding: `${size * 0.10}px`,
            boxShadow: `0 0 ${size * 0.15}px rgba(0,0,0,0.3)`
          }}
        >
          <Img src={staticFile(speakerInfo.icon)} className="size-full rounded-full z-10" />
          {winner && (
            <Img 
              src={staticFile("assets/crown.png")} 
              className="absolute -top-40 -right-16 z-0"
              style={{
                width: size * 0.7,
                height: size * 0.7,
                transform: `rotate(30deg)`,
              }}
            />
          )}
        </div>

        <svg 
          className="absolute top-0 left-0 right-0 bottom-0 m-auto z-0 overflow-visible"
          viewBox={`0 0 ${size} ${size}`} 
          width={size}
          height={size}
        >
          {visualization.map((v, i) => {
            const angle = (i / visualization.length) * Math.PI * 2;
            const baseRadius = size / 2 + size * 0.10;
            const amplitude = size / 2;
            const innerRadius = baseRadius;
            const outerRadius = baseRadius + v * amplitude;
            
            const x1 = (size / 2) + Math.cos(angle) * innerRadius;
            const y1 = (size / 2) + Math.sin(angle) * innerRadius;
            const x2 = (size / 2) + Math.cos(angle) * outerRadius;
            const y2 = (size / 2) + Math.sin(angle) * outerRadius;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={speakerInfo.color}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>
    </>
  );
}