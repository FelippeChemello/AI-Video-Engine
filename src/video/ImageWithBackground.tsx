import { useEffect, useRef, useState } from "react";
import {
    continueRender,
    delayRender,
    Easing,
    Img,
    interpolate,
    useCurrentFrame,
} from "remotion";

const EASING_ENTER = Easing.bezier(0.16, 1, 0.3, 1);

function containRect(
    containerW: number,
    containerH: number,
    imgW: number,
    imgH: number,
) {
    const containerRatio = containerW / containerH;
    const imgRatio = imgW / imgH;

    let width: number;
    let height: number;
    if (imgRatio > containerRatio) {
        width = containerW;
        height = width / imgRatio;
    } else {
        height = containerH;
        width = height * imgRatio;
    }

    const left = (containerW - width) / 2;
    const top = (containerH - height) / 2;
    return { width, height, left, top };
}

export const ImageWithBackground: React.FC<{ src: string }> = ({ src }) => {
    const frame = useCurrentFrame();
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const hasContinuedRender = useRef(false);
    const [delayedRender] = useState(() =>
        delayRender("image-with-background"),
    );
    const [wrapperSize, setWrapperSize] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [imageSize, setImageSize] = useState<{
        width: number;
        height: number;
    } | null>(null);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) {
            return;
        }

        const measure = () => {
            const width = wrapper.clientWidth;
            const height = wrapper.clientHeight;
            if (!width || !height) {
                return;
            }

            setWrapperSize((current) => {
                if (current?.width === width && current.height === height) {
                    return current;
                }

                return { width, height };
            });
        };

        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(wrapper);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!imageSize || !wrapperSize || hasContinuedRender.current) {
            return;
        }

        hasContinuedRender.current = true;
        continueRender(delayedRender);
    }, [delayedRender, imageSize, wrapperSize]);

    const expand = interpolate(frame, [20, 70], [0, 1], {
        easing: EASING_ENTER,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const outerWidth = wrapperSize?.width ?? 0;
    const outerHeight = wrapperSize?.height ?? 0;
    const w = interpolate(expand, [0, 1], [outerWidth * 0.32, outerWidth]);
    const h = interpolate(expand, [0, 1], [outerHeight * 0.28, outerHeight]);
    const radius = interpolate(expand, [0, 1], [24, 0]);
    const backgroundRect = imageSize
        ? containRect(w, h, imageSize.width, imageSize.height)
        : null;

    return (
        <div className="relative h-full w-full" ref={wrapperRef}>
            <div
                className="absolute left-1/2 top-1/2 overflow-hidden"
                style={{
                    width: w,
                    height: h,
                    borderRadius: radius,
                    transform: "translate(-50%, -50%)",
                }}
            >
                <div
                    className="absolute bg-slate-50"
                    style={{
                        display: backgroundRect ? "block" : "none",
                        left: backgroundRect?.left,
                        top: backgroundRect?.top,
                        width: backgroundRect?.width,
                        height: backgroundRect?.height,
                        borderRadius: radius,
                    }}
                />

                <Img
                    src={src}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={{ borderRadius: radius }}
                    decoding="async"
                    onLoad={(e) => {
                        setImageSize({
                            width: e.currentTarget.naturalWidth,
                            height: e.currentTarget.naturalHeight,
                        });
                    }}
                />
            </div>
        </div>
    );
};
