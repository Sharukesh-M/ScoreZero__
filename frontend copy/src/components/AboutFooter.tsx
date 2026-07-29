import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const AboutFooter = () => {
  const footerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: footerRef,
    offset: ["start end", "end end"],
  });

  const textScale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const textOpacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  return (
    <footer id="about" ref={footerRef} className="bg-black text-white font-sans pt-12 md:pt-16 border-t border-white/20 min-h-screen flex flex-col justify-between overflow-hidden">

      {/* Top Section: About ScoreZero Info Grid */}
      <motion.div
        className="px-6 md:px-12 lg:px-16 max-w-[1600px] mx-auto w-full flex flex-col gap-10 shrink-0"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Section Header */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2 border-b border-white/15 pb-6">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00D2FF]">
            About ScoreZero AI
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight text-white max-w-4xl">
            Autonomous PDF Bank Statement Intelligence & Real-Time Credit Metric Scoring
          </h2>
        </motion.div>

        {/* 3 Column Executive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 md:gap-x-12">
          {/* Column 1: OUR MISSION */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#00D2FF]">
              01 · Our Mission
            </h3>
            <p className="font-sans text-xs md:text-sm font-medium leading-relaxed text-white/80">
              ScoreZero eliminates friction in loan underwriting by converting complex, multi-page PDF bank statements into verified 0-100 credit risk scores in under 5 seconds.
            </p>
          </motion.div>

          {/* Column 2: AI ENGINE ARCHITECTURE */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#00D2FF]">
              02 · AI Verification Pipeline
            </h3>
            <p className="font-sans text-xs md:text-sm font-medium leading-relaxed text-white/80">
              Our proprietary neural parsing pipeline extracts transaction ledgers, detects fraudulent alterations, calculates median balance trends, and outputs instant decision metrics.
            </p>
          </motion.div>

          {/* Column 3: ENTERPRISE SECURITY */}
          <motion.div variants={itemVariants} className="flex flex-col gap-3">
            <h3 className="font-sans text-xs font-bold uppercase tracking-widest text-[#00D2FF]">
              03 · Zero-Trust Security
            </h3>
            <p className="font-sans text-xs md:text-sm font-medium leading-relaxed text-white/80">
              Built for banking compliance with SOC2 Type II standards, AES-256 end-to-end payload encryption, and strict zero-retention privacy architecture.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom Section: Branding Text — Full Visibility for 'S' and '®' */}
      <motion.div
        style={{ opacity: textOpacity, scale: textScale }}
        className="w-full flex-1 flex items-center justify-center px-4 overflow-visible select-none pb-6 pt-4 mt-8"
      >
        <h2 className="font-sans font-black text-[13vw] sm:text-[14vw] md:text-[14.5vw] lg:text-[15vw] leading-none text-white uppercase tracking-tighter flex items-start justify-center max-w-full whitespace-nowrap">
          <span className="inline-block">S</span>core<span className="text-[#00D2FF]">Zero</span>
          <span className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mt-[1vw] ml-2 text-[#00D2FF] opacity-90">
            ®
          </span>
        </h2>
      </motion.div>
    </footer>
  );
};

export default AboutFooter;
