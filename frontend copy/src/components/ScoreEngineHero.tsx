import { motion } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";

interface ScoreEngineHeroProps {
  inPortfolio?: boolean;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
}

const BrandLogo = ({ show = true }: { show?: boolean }) => (
  <div
    className="fixed top-6 left-6 md:top-8 md:left-10 z-50 mix-blend-difference transition-opacity duration-500"
    style={{ opacity: show ? 1 : 0, pointerEvents: show ? "auto" : "none" }}
  >
    <p className="font-sans font-black text-2xl md:text-4xl tracking-tighter text-white flex items-start">
      Score<span className="text-[#00D2FF]">Zero</span>
      <span className="text-xs md:text-lg font-medium ml-1 -mt-1 md:-mt-2">®</span>
    </p>
  </div>
);

const AvailabilityBadge = () => null;
const SocialStrip = () => null;

const SpinningCTA = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.6 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="absolute md:z-30 lg:z-10 hidden md:flex items-center justify-center"
    style={{ bottom: "4rem", right: "4rem" }}
  >
    <style>{`
      @keyframes ctaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .cta-ring { animation: ctaSpin var(--cta-spin-duration, 10s) linear infinite; transform-origin: center; }
      .cta-wrap:hover .cta-ring { --cta-spin-duration: 3s; }
      .cta-wrap { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      .cta-wrap:hover { transform: scale(1.08); }
    `}</style>
    <a href="#contact" className="cta-wrap group relative flex items-center justify-center w-[130px] h-[130px]" aria-label="Get a demo">
      <svg viewBox="0 0 130 130" className="absolute inset-0 w-full h-full pointer-events-none">
        <circle cx="65" cy="65" r="62" fill="none" stroke="rgba(0, 210, 255, 0.6)" strokeWidth="1.5" />
      </svg>
      <svg viewBox="0 0 130 130" className="cta-ring absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <path id="cta-circle-path" d="M65,65 m-50,0 a50,50 0 1,1 100,0 a50,50 0 1,1 -100,0" />
        </defs>
        <text fill="rgba(255,255,255,1)" fontSize="8.5" fontFamily="'Inter', sans-serif" fontWeight="900" letterSpacing="4">
          <textPath href="#cta-circle-path">SCOREZERO AI · STATEMENT SCORING · ACCESS PLATFORM ·&nbsp;</textPath>
        </text>
      </svg>
      <span className="absolute inset-4 rounded-full bg-[#00D2FF] scale-0 group-hover:scale-100 transition-transform duration-500 ease-in-out" style={{ transformOrigin: "center" }} />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative z-10 w-6 h-6 text-white group-hover:text-black" style={{ transition: "color 0.3s ease" }}>
        <path d="M7 17L17 7M17 7H7M17 7v10" />
      </svg>
    </a>
  </motion.div>
);

const MobileSocialStrip = () => null;

export default function ScoreEngineHero({ inPortfolio = true, onOpenLogin, onOpenSignup }: ScoreEngineHeroProps) {
  return (
    <div className="relative bg-black overflow-hidden">
      {/* Background Cyber Glow Flare Grid Entrance Effect */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.25, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,210,255,0.15)_0%,transparent_70%)] pointer-events-none"
      />

      <BrandLogo show={inPortfolio} />

      {/* Hero Section with Viewport Entrance Animation */}
      <section className="relative min-h-[90vh] md:h-screen bg-black flex flex-col justify-between px-4 pt-16 pb-8 sm:px-6 sm:py-12 md:px-16 md:py-16 z-20 overflow-hidden">
        <AvailabilityBadge />
        <SocialStrip />
        <SpinningCTA />

        {/* Mobile Socials Container */}
        <div className="flex items-center justify-end md:hidden pr-0 my-1 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <MobileSocialStrip />
          </div>
        </div>

        {/* Main Headline Entrance Animation */}
        <div className="z-10 mt-auto mb-4 sm:mb-6 md:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex flex-col gap-4 sm:gap-6"
          >
            {/* 1. Main Title */}
            <h2 className="font-sans font-bold text-4xl sm:text-6xl md:text-8xl lg:text-[7.5rem] xl:text-[9rem] leading-[0.9] tracking-tighter text-white uppercase text-left drop-shadow-[0_0_35px_rgba(0,210,255,0.15)]">
              Score<span className="text-[#00D2FF]">Zero</span><br />AI Engine
            </h2>

            {/* 2. Login & Sign Up CTA Buttons Group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center gap-3 my-2"
            >
              {onOpenLogin && (
                <button
                  onClick={onOpenLogin}
                  className="px-5 py-2.5 rounded-full border border-[#00D2FF]/40 text-[#00D2FF] font-bold text-xs hover:border-[#00D2FF] hover:bg-[#00D2FF]/10 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,210,255,0.2)]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login</span>
                </button>
              )}
              {onOpenSignup && (
                <button
                  onClick={onOpenSignup}
                  className="px-6 py-2.5 rounded-full bg-[#00D2FF] text-black font-extrabold text-xs hover:bg-[#4BE7FF] transition-all flex items-center gap-1.5 shadow-[0_0_25px_rgba(0,210,255,0.5)]"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              )}
            </motion.div>

            {/* 3. Pipeline Sub-text */}
            <div className="w-full">
              <div className="w-12 h-[2px] bg-[#00D2FF] mb-3 md:hidden" />
              <p className="font-sans text-[11px] sm:text-xs md:text-sm font-medium text-white/90 leading-relaxed tracking-wide uppercase text-left max-w-3xl">
                AI Verification Pipeline: <span className="text-[#00D2FF] font-bold">User Upload ➔ PDF Statement ➔ PDF Parsing ➔ Metric Score (0-100) ➔ AI Suggestion</span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
