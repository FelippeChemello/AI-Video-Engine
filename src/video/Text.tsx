import React, { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

interface TextProps extends React.HTMLAttributes<HTMLDivElement> {
  maxFontSize?: number;
  minFontSize?: number;
  alignedWords: Array<{ start: number; end: number; text: string }>;
  color?: string;
  highlightColor?: string;
}

const Text: React.FC<TextProps> = ({
  alignedWords,
  className,
  maxFontSize = 240,
  minFontSize = 10,
  color = '#000',
  highlightColor = 'red',
  ...props
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  const [fontSize, setFontSize] = useState(maxFontSize);

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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
      (text.scrollWidth > container.clientWidth || text.scrollHeight > container.clientHeight) &&
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
      className={`w-full h-full flex justify-center items-center overflow-hidden ${className || ''}`}
      {...props}
    >
      <span
        ref={textRef}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: '1',
          whiteSpace: 'wrap',
          color,
          textShadow: `
            -4px -4px 0 #fff,  
            4px -4px 0 #fff,   
            -4px 4px 0 #fff,   
            4px 4px 0 #fff,    
            0px 4px 0 #fff,    
            4px 0px 0 #fff,    
            0px -4px 0 #fff,   
            -4px 0px 0 #fff    
          `,
        }}
        className="text-center"
      >
        {alignedWords.map((word, index) => (
          <span
            key={index}
            style={{
              display: 'inline-block',
              color: frame >= Math.floor(word.start * fps) && frame <= Math.floor(word.end * fps) ? highlightColor : color,
            }}
            dangerouslySetInnerHTML={{
              __html: `${word.text} &nbsp;`,
            }}
          />
        ))}
      </span>
    </div>
  );
};

export default Text;