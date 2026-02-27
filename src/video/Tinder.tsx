import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { BellIcon, BlocksIcon, MapPinIcon, MessageCircleIcon, Settings2Icon, SparkleIcon, UserIcon } from 'lucide-react'
import { Audio } from '@remotion/media'
import { z } from "zod";
import { loadFont } from "@remotion/google-fonts/Montserrat";
import clsx from "clsx";

import { videoSchema } from "../config/types";
import { TinderLogo } from "./TinderLogo";

const { fontFamily } = loadFont();

export const Tinder: React.FC<z.infer<typeof videoSchema>> = ({ segments, audio, settings }) => {
  const { fps } = useVideoConfig()
  const frame = useCurrentFrame();

  let accumulatedFrames = 0;
  const timedSegments = segments.map(s => {
    const start = accumulatedFrames;
    const duration = Math.ceil((s.duration || 0) * fps);
    accumulatedFrames += duration;
    return { ...s, startFrame: start, durationInFrames: duration };
  });

  const introDuration = timedSegments[0].durationInFrames;
  const bioIntroDuration = timedSegments[1].durationInFrames;
  
  const verdictStartFrame = timedSegments.at(-1)?.startFrame || 0;
  
  const photoSegments = timedSegments.filter(s => s.mediaSrc);
  const activePhotoIndex = photoSegments.findIndex((photo) => {
    const start = photo.startFrame;
    const end = start + photo.durationInFrames;
    return frame >= start && frame < end;
  });

  const showingPhotoIndex = activePhotoIndex === -1 
    ? (frame > (introDuration + bioIntroDuration) ? photoSegments.length - 1 : 0) 
    : activePhotoIndex;

  const verdictSpring = spring({
    frame,
    fps,
    config: {
        damping: 15,
        stiffness: 150,
        mass: 1
    },
    delay: verdictStartFrame + 10,
  });

  const springConfig = { damping: 200, stiffness: 200, mass: 1 };

  return (
    <>
      {audio?.[0] && <Audio src={staticFile(audio[0].src)} />}
      
      <Sequence durationInFrames={introDuration}>
        <AbsoluteFill style={{ background: 'linear-gradient(to right, #ea3374, #e45d4c)', fontFamily }}>
          <TinderLogo pulse />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={introDuration - 15}>
        <AbsoluteFill className="bg-white" style={{ fontFamily }}>
          
          <section className="flex flex-row justify-between items-center h-36 p-8 z-20 bg-white relative">
            <Img src={staticFile("assets/tinder-logo.png")} className="h-30"/>
            <div className="flex flex-row items-center gap-16 text-gray-400">
              <BellIcon className="w-16 h-16"/>
              <Settings2Icon className="w-16 h-16"/>
            </div>
          </section>

          <div className="absolute top-[160px] w-full h-4 z-30 flex flex-row gap-4 px-4">
             {photoSegments.map((_, idx) => {
               const isActive = idx === showingPhotoIndex;
               return (
                 <div
                   key={idx}
                   className={clsx(
                     "flex-1 h-3 rounded-full", 
                     isActive ? "bg-white shadow-md" : "bg-white/40"
                   )}
                 />
               );
             })}
          </div>

          <div 
            className={clsx("absolute inset-0 z-50 top-96 w-fit", settings.swipe === 'left' ? 'left-1/2' : 'left-20')}
            style={{
                transform: `scale(${interpolate(verdictSpring, [0, 1], [0, 1])})`, 
                opacity: interpolate(verdictSpring, [0, 1], [0, 1]) 
            }}
          >
            {settings.swipe === 'left' && (
              <div className="text-red-600 text-9xl font-bold rotate-[-20deg] opacity-90 border-[12px] border-red-600 px-8 py-4 rounded-xl shadow-2xl bg-white/20 backdrop-blur-sm">
                NOPE
              </div>
            )}
            {settings.swipe === 'right' && (
              <div className="text-green-600 text-9xl font-bold rotate-[20deg] opacity-90 border-[12px] border-green-600 px-8 py-4 rounded-xl shadow-2xl bg-white/20 backdrop-blur-sm">
                LIKE
              </div>
            )}
          </div>

          <section className="relative w-full min-h-[85%] overflow-hidden bg-black">
            {photoSegments.map((photo, index) => {
              const timeSinceStart = frame - photo.startFrame;
              const timeSinceEnd = frame - (photo.startFrame + photo.durationInFrames);
              
              const isFirstPhoto = index === 0;
              const isLastPhoto = index === photoSegments.length - 1;

              const slideInProgress = spring({ frame: timeSinceStart, fps, config: springConfig });
              const slideOutProgress = spring({ frame: timeSinceEnd, fps, config: springConfig });

              const entranceOffset = isFirstPhoto ? 0 : interpolate(slideInProgress, [0, 1], [100, 0]);
              const exitOffset = isLastPhoto ? 0 : interpolate(slideOutProgress, [0, 1], [0, 100]);
              const xPosition = entranceOffset - exitOffset;

              return (
                <AbsoluteFill key={index} style={{
                    transform: `translateX(${xPosition}%)`,
                    opacity: (xPosition > 100 || xPosition < -100) ? 0 : 1,
                    zIndex: 10
                  }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-20 pointer-events-none" />
                  <Img 
                    src={staticFile(photo.mediaSrc!)} 
                    className="w-full h-full object-cover"
                  />
                </AbsoluteFill>
              );
            })}
          </section>

          <section className="absolute bottom-[144px] w-full p-8 z-30 text-white">
            <h1 className="text-8xl flex items-baseline gap-4">
              <span className="font-bold">{settings?.profile.name}</span>
              <span className="text-6xl font-normal opacity-90">{settings?.profile.age}</span>
            </h1>
            
            <div className="flex flex-row items-center gap-4 mt-2 mb-8 text-5xl opacity-90">
              <MapPinIcon className="size-12"/> 
              {settings?.profile.location}
            </div>
            
            <p className="text-4xl leading-snug flex flex-wrap gap-x-3">
              {settings?.bio_roast.map((roastItem: any, i: number) => {
                const matchedSegment = timedSegments.find(s => s.text === roastItem.narration);
                let itemWeight = 0;
                
                if (matchedSegment) {
                  const enter = spring({ frame: frame - matchedSegment.startFrame, fps, config: springConfig });
                  const exit = spring({ frame: frame - (matchedSegment.startFrame + matchedSegment.durationInFrames), fps, config: springConfig });
                  itemWeight = Math.max(0, enter - exit); 
                }

                const isAnyBioSegmentActive = timedSegments.some(s => 
                  frame >= s.startFrame && 
                  frame < s.startFrame + s.durationInFrames &&
                  settings.bio_roast.some((r: any) => r.narration === s.text)
                );
                
                const globalRoastWeight = isAnyBioSegmentActive ? 1 : 0; 
                const inactiveOpacity = interpolate(globalRoastWeight, [0, 1], [0.8, 0.3]);
                const opacity = interpolate(itemWeight, [0, 1], [inactiveOpacity, 1]);
                const scale = interpolate(itemWeight, [0, 1], [1, 1.05]);
                const maxBlur = interpolate(globalRoastWeight, [0, 1], [0, 2]);
                const blur = interpolate(itemWeight, [0, 1], [maxBlur, 0]);
                const bgOpacity = interpolate(itemWeight, [0, 1], [0, 0.4]);

                return (
                  <span 
                    key={i} 
                    className="rounded px-2 py-1"
                    style={{
                      opacity,
                      transform: `scale(${scale})`,
                      filter: `blur(${blur}px)`,
                      backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
                      willChange: "transform, opacity, filter"
                    }}
                  >
                    {roastItem.highlight}
                  </span>
                )
              })}
            </p>
          </section>

          <section className="flex flex-row justify-around items-center h-full p-8 z-20 bg-white relative shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            <Img src={staticFile("assets/tinder-icon.png")} className="size-20"/>
            <BlocksIcon className="size-20 text-yellow-500"/>
            <SparkleIcon className="size-20 text-cyan-500"/>
            <MessageCircleIcon className="size-20 text-green-500"/>
            <UserIcon className="size-20 text-purple-500"/>
          </section>
        </AbsoluteFill>
      </Sequence>
    </>
  )
};