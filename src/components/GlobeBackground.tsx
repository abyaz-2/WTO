"use client";

import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("./Globe"), {
  ssr: false,
  loading: () => null,
});

interface GlobeBackgroundProps {
  visible: boolean;
}

export default function GlobeBackground({ visible }: GlobeBackgroundProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="globe-bg"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0 z-0"
        >
          <Globe />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
