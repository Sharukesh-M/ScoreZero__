import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";

interface NavItem {
  label: string;
  href: string;
  number: string;
}

const navItems: NavItem[] = [
  { label: "How it Works", href: "#modules", number: "01" },
  { label: "Contact", href: "#contact", number: "02" },
  { label: "About", href: "#about", number: "03" },
];

const ease = [0.76, 0, 0.24, 1] as [number, number, number, number];
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

const overlayVariants: Variants = {
  closed: {
    clipPath: "inset(0% 0% 100% 0%)",
    transition: { duration: 1.0, ease },
  },
  open: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 1.0, ease },
  },
};

const itemVariants: Variants = {
  closed: {
    y: 40,
    opacity: 0,
    transition: { duration: 0.8, ease },
  },
  open: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      duration: 1.0,
      delay: 0.4 + i * 0.1,
      ease: easeOut,
    },
  }),
};

const OverlayMenu = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  const handleNavClick = () => {
    setOpen(false);
  };

  return (
    <>
      {/* Hamburger Button */}
      <div
        className="fixed top-6 right-6 md:top-8 md:right-10 z-[200]"
        style={{ transform: "translateZ(0)", willChange: "transform" }}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center justify-center gap-[5px] w-14 h-14 md:w-16 md:h-16 rounded-full bg-black transition-colors duration-300 relative border border-[#00D2FF]/40 shadow-[0_0_20px_rgba(0,210,255,0.3)]"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <motion.span
            animate={open ? { rotate: 45, y: 6.5, scaleX: 0.8 } : { rotate: 0, y: 0, scaleX: 1 }}
            transition={{ duration: 0.6, ease }}
            className="absolute block h-[1.5px] w-[22px] bg-[#00D2FF] origin-center"
            style={{ top: "35%" }}
          />
          <motion.span
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, ease }}
            className="absolute block h-[1.5px] w-[22px] bg-[#00D2FF] origin-center"
            style={{ top: "50%", marginTop: "-0.75px" }}
          />
          <motion.span
            animate={open ? { rotate: -45, y: -6.5, scaleX: 0.8 } : { rotate: 0, y: 0, scaleX: 1 }}
            transition={{ duration: 0.6, ease }}
            className="absolute block h-[1.5px] w-[22px] bg-[#00D2FF] origin-center"
            style={{ bottom: "35%" }}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-[100] bg-black flex flex-col justify-between px-8 md:px-16 pt-16 pb-10 md:pt-20 md:pb-14"
          >


            {/* Nav Links */}
            <nav className="flex flex-col gap-0">
              {navItems.map((item, i) => (
                <div
                  key={item.label}
                  className="overflow-hidden border-b border-white/20 py-3 md:py-4"
                >
                  <motion.a
                    href={item.href}
                    onClick={handleNavClick}
                    custom={i}
                    variants={itemVariants}
                    initial="closed"
                    animate="open"
                    exit="closed"
                    className="flex items-baseline justify-between group cursor-pointer"
                  >
                    <span className="text-4xl md:text-6xl lg:text-7xl font-bold text-white uppercase tracking-tight leading-none group-hover:text-[#00D2FF] group-hover:translate-x-3 transition-all duration-300 ease-out">
                      {item.label}
                    </span>
                    <span className="text-xs text-[#00D2FF] font-mono tracking-widest self-start mt-2 font-bold">
                      {item.number}
                    </span>
                  </motion.a>
                </div>
              ))}
            </nav>

            {/* Bottom copyright */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.8 } }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              className="text-xs text-white/40 font-mono tracking-widest mt-8 md:mt-0 md:self-end"
            >
              © 2026 SCOREZERO AI PLATFORM
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OverlayMenu;
