import React, { useEffect, useRef, useState } from 'react';
import { useLenis } from 'lenis/react';
import { Sparkles, Upload, FileCode, Award, CheckCircle2, ChevronRight } from 'lucide-react';

export interface ScrollHeroProps {
  onOpenSignup?: () => void;
  onOpenLogin?: () => void;
}

const PROCESS_STEPS = [
  { id: 1, label: 'Uploading', icon: Upload, range: [0, 0.20] },
  { id: 2, label: 'Parsing', icon: FileCode, range: [0.20, 0.40] },
  { id: 3, label: '0-100 Score', icon: Award, range: [0.40, 0.60] },
  { id: 4, label: 'AI Suggestion', icon: Sparkles, range: [0.60, 0.80] },
  { id: 5, label: 'Loan Approval', icon: CheckCircle2, range: [0.80, 1.0] },
];

export const ScrollHero: React.FC<ScrollHeroProps> = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollRatio, setScrollRatio] = useState(0);

  const rafIdRef = useRef<number | null>(null);
  const prefersReducedMotionRef = useRef<boolean>(false);
  const lastTargetTimeRef = useRef<number>(-1);

  // High-precision subpixel-aligned video frame drawing on canvas
  const drawVideoFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.readyState < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const displayW = Math.round(rect.width || window.innerWidth);
    const displayH = Math.round(rect.height || window.innerHeight);

    if (displayW === 0 || displayH === 0) return;

    const targetCanvasW = Math.round(displayW * dpr);
    const targetCanvasH = Math.round(displayH * dpr);

    if (canvas.width !== targetCanvasW || canvas.height !== targetCanvasH) {
      canvas.width = targetCanvasW;
      canvas.height = targetCanvasH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const videoW = video.videoWidth || 1920;
    const videoH = video.videoHeight || 1080;
    const videoAspect = videoW / videoH;
    const canvasAspect = displayW / displayH;

    let drawWidth = displayW;
    let drawHeight = displayH;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasAspect > videoAspect) {
      drawHeight = displayW / videoAspect;
      offsetY = (displayH - drawHeight) / 2;
    } else {
      drawWidth = displayH * videoAspect;
      offsetX = (displayW - drawWidth) / 2;
    }

    ctx.clearRect(0, 0, displayW, displayH);
    try {
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    } catch {
      // Ignore transient draw errors while video seeks
    }
    ctx.restore();
  };

  // Preload video & motion preferences
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = motionQuery.matches;

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
      drawVideoFrame();
    };
    motionQuery.addEventListener('change', handleMotionChange);

    const video = videoRef.current;
    if (video) {
      if (video.readyState >= 2) {
        setIsLoaded(true);
        drawVideoFrame();
      }
    }

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  // Update canvas sizing matching DPR for sharp crispness
  useEffect(() => {
    const updateCanvasSize = () => {
      drawVideoFrame();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isLoaded]);

  // Calculate scroll progress and sync video currentTime
  const updateScrollProgress = () => {
    if (prefersReducedMotionRef.current) return;
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const sectionOffsetTop = window.scrollY + rect.top;
    const sectionHeight = section.offsetHeight;

    const scrollTop = window.scrollY - sectionOffsetTop;
    const maxScroll = sectionHeight - window.innerHeight;

    if (maxScroll <= 0) return;

    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    setScrollRatio(progress);

    const video = videoRef.current;
    if (video && video.duration) {
      const targetTime = progress * video.duration;
      if (Math.abs(lastTargetTimeRef.current - targetTime) > 0.01) {
        lastTargetTimeRef.current = targetTime;
        video.currentTime = targetTime;
      }
    }
  };

  // Continuously draw canvas in sync with video seeking
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      if (!active) return;
      updateScrollProgress();
      drawVideoFrame();
      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    rafIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      updateScrollProgress();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useLenis(() => {
    updateScrollProgress();
  });

  // Active step in process
  const activeStep = PROCESS_STEPS.find(
    (step) => scrollRatio >= step.range[0] && (scrollRatio < step.range[1] || step.id === 5)
  ) || PROCESS_STEPS[0];

  return (
    <section
      ref={sectionRef}
      className="relative h-[300vh] w-full bg-[#08101C] text-white touch-pan-y"
    >
      {/* Hidden Video Source element */}
      <video
        ref={videoRef}
        src="/hero-animation.mp4"
        preload="auto"
        playsInline
        muted
        className="hidden"
        onLoadedData={() => {
          setIsLoaded(true);
          drawVideoFrame();
        }}
        onCanPlay={() => {
          setIsLoaded(true);
          drawVideoFrame();
        }}
        onSeeked={() => {
          drawVideoFrame();
        }}
      />

      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Canvas Element */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500"
          style={{ opacity: isLoaded ? 1 : 0 }}
        />

        {/* Mobile-Optimized White-Themed AI Score Pipeline Component */}
        {isLoaded && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-16 z-30 flex flex-col gap-2.5 p-3.5 sm:p-5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/30 transition-all duration-300 pointer-events-auto max-w-full sm:max-w-md text-slate-900">
            {/* Header / Active Stage Title */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-slate-900 uppercase">
                  ScoreZero AI Score Pipeline
                </span>
              </div>
            </div>

            {/* Interactive Process Pipeline Steps */}
            <div className="flex items-center justify-between gap-1 pt-0.5 overflow-x-auto no-scrollbar">
              {PROCESS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = step.id === activeStep.id;
                const isPassed = scrollRatio >= step.range[1];

                return (
                  <React.Fragment key={step.id}>
                    <div
                      className={`flex flex-col items-center gap-1 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-[#00D2FF] text-slate-950 font-bold scale-105 shadow-md shadow-cyan-400/30'
                          : isPassed
                          ? 'text-cyan-600 font-semibold'
                          : 'text-slate-400 opacity-70'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'animate-bounce text-slate-950' : ''}`} />
                      <span className="text-[9px] sm:text-[10px] font-mono tracking-tight whitespace-nowrap">
                        {step.label}
                      </span>
                    </div>

                    {idx < PROCESS_STEPS.length - 1 && (
                      <div className="flex items-center px-0.5 flex-shrink-0">
                        <ChevronRight
                          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                            isPassed || isActive ? 'text-cyan-500 font-bold' : 'text-slate-300'
                          }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Loan Approved Banner at last frame lock */}
            {(scrollRatio >= 0.82 || activeStep.id === 5) && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-0.5 py-1.5 sm:py-2 px-3 bg-emerald-500 text-white font-black text-[11px] sm:text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/30 animate-pulse border border-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span>LOAN APPROVED</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScrollHero;

