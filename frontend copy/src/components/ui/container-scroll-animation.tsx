import React, { useRef } from "react";
import { useScroll, useTransform, useSpring, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent?: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger tracking smoothly as section enters viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  // Balanced, linear spring physics to prevent scroll acceleration or rushing
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 35,
    mass: 0.3,
    restDelta: 0.0001,
  });

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // SVG / CSS laser draws evenly and gradually [0 -> 0.42]
  const pathLength = useTransform(smoothProgress, [0, 0.42], [0, 1]);
  
  // Laser line fades out gently after expanding into top border [0.42 -> 0.54]
  const lineOpacity = useTransform(smoothProgress, [0, 0.05, 0.42, 0.54], [0.9, 1, 1, 0]);

  // Top border beam expands across full top edge of card upon laser impact [0.38 -> 0.54]
  const topBorderScaleX = useTransform(smoothProgress, [0.38, 0.54], [0, 1]);

  // STRICT REVEAL ORDER: Portfolio first page card stays 100% invisible UNTIL laser line reaches card top border at 0.42
  const cardOpacity = useTransform(smoothProgress, [0, 0.42, 0.56, 1], [0, 0, 1, 1]);
  
  const scale = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    isMobile ? [0.85, 0.93, 1, 1] : [0.86, 0.94, 1, 1]
  );
  
  const rotate = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    [18, 10, 0, 0]
  );
  
  const width = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    isMobile ? ["90vw", "95vw", "100vw", "100vw"] : ["86vw", "92vw", "100vw", "100vw"]
  );
  
  const height = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    isMobile ? ["80vh", "86vh", "100vh", "100vh"] : ["80vh", "86vh", "100vh", "100vh"]
  );
  
  const borderRadius = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    ["20px", "12px", "0px", "0px"]
  );
  
  const borderWidth = useTransform(
    smoothProgress,
    [0, 0.42, 0.82, 1],
    ["2px", "2px", "0px", "0px"]
  );

  const headerOpacity = useTransform(smoothProgress, [0, 0.20, 0.42], [1, 0.5, 0]);
  const headerTranslateY = useTransform(smoothProgress, [0, 0.5, 1], [0, -50, -100]);

  const dPath = `M 820 0 C 820 100, 500 100, 500 200`;

  return (
    <div
      className="h-[160vh] sm:h-[180vh] flex items-center justify-center relative w-full bg-black overflow-visible"
      ref={containerRef}
    >
      {/* Sticky Viewport Wrapper so laser line and card stay 100% synchronized on scroll */}
      <div
        className="w-full h-full relative sticky top-0 flex flex-col items-center justify-center overflow-hidden"
        style={{
          perspective: "1000px",
        }}
      >
        {/* Mobile View: Hardware-Accelerated GPU Straight Vertical Laser Line (Zero Lag) */}
        {isMobile ? (
          <motion.div
            style={{ scaleY: pathLength, opacity: lineOpacity, transformOrigin: "top" }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[3.5px] h-36 bg-gradient-to-b from-[#00D2FF] via-cyan-300 to-[#00D2FF] shadow-[0_0_20px_#00D2FF] z-50 pointer-events-none rounded-full"
          />
        ) : (
          /* Desktop View: SVG Curved Electric Cyan Laser Beam */
          <svg
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
            className="absolute top-0 left-0 w-full h-44 sm:h-64 z-50 pointer-events-none overflow-visible drop-shadow-[0_0_25px_#00D2FF]"
          >
            <defs>
              <linearGradient id="curvedCyanLaser" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D2FF" stopOpacity="1" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
                <stop offset="100%" stopColor="#00D2FF" stopOpacity="1" />
              </linearGradient>
              <filter id="cyanGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Laser Glow Curve */}
            <motion.path
              d={dPath}
              fill="none"
              stroke="#00D2FF"
              strokeWidth="10"
              strokeOpacity="0.5"
              filter="url(#cyanGlowFilter)"
              style={{ pathLength, opacity: lineOpacity }}
            />

            {/* Core Electric Cyan Curved Laser Line */}
            <motion.path
              d={dPath}
              fill="none"
              stroke="url(#curvedCyanLaser)"
              strokeWidth="5"
              strokeLinecap="round"
              style={{ pathLength, opacity: lineOpacity }}
            />
          </svg>
        )}

        {titleComponent && (
          <Header opacity={headerOpacity} translateY={headerTranslateY} titleComponent={titleComponent} />
        )}
        <Card rotate={rotate} scale={scale} width={width} height={height} borderRadius={borderRadius} borderWidth={borderWidth} opacity={cardOpacity} topBorderScaleX={topBorderScaleX}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ opacity, translateY, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        opacity,
        translateY,
      }}
      className="max-w-5xl mx-auto text-center px-4 mb-4 z-10 transition-opacity duration-300"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  width,
  height,
  borderRadius,
  borderWidth,
  opacity,
  topBorderScaleX,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  width: MotionValue<string>;
  height: MotionValue<string>;
  borderRadius: MotionValue<string>;
  borderWidth: MotionValue<string>;
  opacity: MotionValue<number>;
  topBorderScaleX: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        width,
        height,
        borderRadius,
        borderWidth,
        opacity,
        willChange: "transform, opacity",
        borderColor: "rgba(0, 210, 255, 0.5)",
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="mx-auto bg-black shadow-2xl overflow-hidden relative"
    >
      {/* Electric Cyan Laser Top Border Beam spanning across full top edge of card */}
      <motion.div
        style={{ scaleX: topBorderScaleX, opacity }}
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent shadow-[0_0_25px_#00D2FF] z-50 pointer-events-none origin-center"
      />

      <div className="h-full w-full overflow-y-auto no-scrollbar bg-black">
        {children}
      </div>
    </motion.div>
  );
};
