"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import GlobeBackground from "@/components/GlobeBackground";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [globeVisible, setGlobeVisible] = useState(true);

  const handleLoginSuccess = useCallback(() => {
    setGlobeVisible(false);
    setTimeout(() => {
      router.push("/dashboard");
    }, 850);
  }, [router]);

  return (
    <main className="relative min-h-screen bg-[#05162D] flex items-center justify-center overflow-hidden">
      <GlobeBackground visible={globeVisible} />

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#05162D]/20 via-[#05162D]/50 to-[#05162D] pointer-events-none" />

      <div className="relative z-10 w-[min(30rem,80vw)] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="text-center mb-10">
            <span className="block text-[10px] font-semibold tracking-[0.3em] uppercase text-[#6CA9FF] mb-4">
              World Trade Organization
            </span>
            <h1 className="font-extrabold tracking-tight text-white text-lg leading-tight">
              Dispute Documentation
            </h1>
            <p className="text-xs text-[#B6C3D1] font-light mt-2">
              Sign in to access the platform.
            </p>
          </div>

          <div style={{ padding: '80px 64px' }} className="bg-[#112F5A] rounded-xl border border-[rgba(255,255,255,0.2)] shadow-xl">
            <LoginForm onSuccess={handleLoginSuccess} />
          </div>
        </motion.div>
      </div>

      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-[10px] text-[#7D8DA0]/50 font-medium tracking-widest uppercase select-none">
        Kalavakkam, Tamil Nadu
      </span>
    </main>
  );
}
