import { AbsoluteFill, useCurrentFrame } from "remotion";

export const TinderLogo: React.FC<{ pulse?: boolean, className?: string }> = ({ pulse = false, ...props }) => {
  const frame = useCurrentFrame()

  const transform = pulse ? `scale(${1 + 0.1 * Math.sin((frame % 30) / 30 * 2 * Math.PI)})` : 'scale(1)';
  const opacity = pulse ? 0.5 + 0.5 * Math.sin((frame % 30) / 30 * 2 * Math.PI) : 1;
  
  return (
    <AbsoluteFill {...props}>
      <svg
        fill="#FFFFFF"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 50 50"
        width="250px"
        height="250px"
        style={{
          transform,
          opacity,
        }}
        className="m-auto"
      >
        <path d="M25,48C13.225,48,5,39.888,5,28.271c0-6.065,3.922-12.709,9.325-15.797c0.151-0.086,0.322-0.132,0.496-0.132c0.803,0,1.407,0.547,1.407,1.271c0,1.18,0.456,3.923,1.541,5.738c4.455-1.65,9.074-5.839,7.464-16.308c-0.008-0.051-0.012-0.102-0.012-0.152c0-0.484,0.217-0.907,0.579-1.132c0.34-0.208,0.764-0.221,1.14-0.034C31.173,3.808,45,11.892,45,28.407C45,39.394,36.215,48,25,48z M26.052,3.519c0.003,0.001,0.005,0.002,0.008,0.004C26.057,3.521,26.055,3.52,26.052,3.519z" />
      </svg>
    </AbsoluteFill>
  )
};