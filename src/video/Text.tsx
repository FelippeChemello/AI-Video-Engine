import React, {
    useRef,
    useState,
    useLayoutEffect,
    useCallback,
    useEffect,
} from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { sanitizeText } from "../utils/sanitize-text";

interface TextProps extends React.HTMLAttributes<HTMLDivElement> {
    maxFontSize?: number;
    minFontSize?: number;
    alignedWords: Array<{ start: number; end: number; text: string }>;
    color?: string;
    highlightColor?: string;
    fontWeight?: number | string;
    /** Scale multiplier for the active word. 1 keeps color-only behavior. */
    activeScale?: number;
    /**
     * Optional frame override.
     * Pass a parent `frame` when using inside `<Sequence from={...}>`.
     */
    frame?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const getWordTiming = (word: { start: number; end: number }, fps: number) => {
    const startFrame = Math.floor(word.start * fps);
    const endFrame = Math.floor(word.end * fps);
    return { startFrame, endFrame };
};

const getWordEmphasis = (
    frame: number,
    word: { start: number; end: number },
    fps: number,
    options?: { enterFrames?: number; exitFrames?: number },
) => {
    const enterFrames = options?.enterFrames ?? 6;
    const exitFrames = options?.exitFrames ?? 6;
    const { startFrame, endFrame } = getWordTiming(word, fps);
    const active = frame >= startFrame && frame <= endFrame;

    const enter = interpolate(
        frame,
        [startFrame, startFrame + enterFrames],
        [0, 1],
        {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.ease),
        },
    );

    const exit = interpolate(frame, [endFrame, endFrame + exitFrames], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.in(Easing.ease),
    });

    return active ? enter : exit;
};

const Text: React.FC<TextProps> = ({
    alignedWords,
    className,
    maxFontSize = 240,
    minFontSize = 10,
    color = "#000",
    highlightColor = "red",
    fontWeight,
    activeScale = 1,
    frame: frameOverride,
    ...props
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    const [fontSize, setFontSize] = useState(maxFontSize);

    const localFrame = useCurrentFrame();
    const frame = frameOverride ?? localFrame;
    const { fps } = useVideoConfig();

    const baseTextShadow = `
        -4px -4px 0 #fff,  
        4px -4px 0 #fff,   
        -4px 4px 0 #fff,   
        4px 4px 0 #fff,    
        0px 4px 0 #fff,    
        4px 0px 0 #fff,    
        0px -4px 0 #fff,   
        -4px 0px 0 #fff    
    `;

    const adjustFontSize = useCallback(() => {
        const container = containerRef.current;
        const text = textRef.current;

        if (!container || !text) {
            return;
        }

        if (container.clientWidth === 0 || container.clientHeight === 0) {
            return;
        }

        let currentFontSize = maxFontSize;
        text.style.fontSize = `${currentFontSize}px`;

        while (
            (text.scrollWidth > container.clientWidth ||
                text.scrollHeight > container.clientHeight) &&
            currentFontSize > minFontSize
        ) {
            currentFontSize -= 1;
            text.style.fontSize = `${currentFontSize}px`;
        }
        setFontSize(currentFontSize);
    }, [maxFontSize, minFontSize]);

    useLayoutEffect(() => {
        adjustFontSize();
    }, [alignedWords, adjustFontSize]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            adjustFontSize();
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [adjustFontSize]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full flex justify-center items-center overflow-hidden ${className || ""}`}
            {...props}
        >
            <span
                ref={textRef}
                style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: "1",
                    whiteSpace: "wrap",
                    color,
                    fontWeight,
                    textShadow: baseTextShadow,
                }}
                className="text-center"
            >
                {alignedWords.map((word, index) => {
                    const { startFrame, endFrame } = getWordTiming(word, fps);
                    const active = frame >= startFrame && frame <= endFrame;
                    const emphasis = clamp01(getWordEmphasis(frame, word, fps));
                    const scale =
                        activeScale > 1 ? 1 + emphasis * (activeScale - 1) : 1;
                    const glow = active ? 0.35 + emphasis * 0.25 : 0;

                    return (
                        <span
                            key={index}
                            style={{
                                display: "inline-block",
                                color: active ? highlightColor : color,
                                transform: `scale(${scale})`,
                                transformOrigin: "center bottom",
                                textShadow:
                                    glow > 0
                                        ? `0 0 ${Math.round(18 * glow)}px ${highlightColor}88, ${baseTextShadow}`
                                        : undefined,
                            }}
                            dangerouslySetInnerHTML={{
                                __html: `${sanitizeText(word.text)} &nbsp;`,
                            }}
                        />
                    );
                })}
            </span>
        </div>
    );
};

export default Text;
