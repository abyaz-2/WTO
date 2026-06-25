"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

export default function Hero() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const globeY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  return (
    <section ref={ref} className="relative w-full min-h-screen overflow-hidden bg-[#05162D]">
      <motion.div
        style={reducedMotion ? {} : { y: globeY }}
        className="absolute inset-0 z-0"
      >
        <Globe />
      </motion.div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-[#05162D] pointer-events-none" />

      <motion.div
        style={reducedMotion ? {} : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 pointer-events-none min-h-screen flex flex-col items-center justify-center px-6 sm:px-12"
      >
        <div className="w-full max-w-[var(--content-width,1200px)] mx-auto flex flex-col items-center text-center gap-16 sm:gap-20">
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-[#6CA9FF]">
              World Trade Organization
            </span>
          </motion.div>

          <motion.h1
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="font-extrabold tracking-[-0.04em] leading-[0.95] text-white text-[clamp(2.5rem,8vw,7rem)]"
          >
            Coming Soon
          </motion.h1>

          <motion.p
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-[640px] text-base sm:text-lg leading-relaxed text-[#B6C3D1] font-light"
          >
            Welcome to the SSN-SNUC 2026&apos;s WTO website.<br />
            Please wait for the next update.
          </motion.p>

          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
            className="flex items-center gap-6 text-xs text-[#7D8DA0] font-medium tracking-wider uppercase"
          >
            <span className="w-px h-5 bg-[rgba(255,255,255,0.08)]" />
            <span>Kalavakkam, Tamil Nadu</span>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
