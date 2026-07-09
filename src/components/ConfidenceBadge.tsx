"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ConfidenceBadgeProps {
  score: number;
  dimensions?: Record<string, number>;
  className?: string;
}

function getConfidenceLabel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 0.85) {
    return {
      label: "Strong",
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    };
  }
  if (score >= 0.7) {
    return {
      label: "Moderate",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    };
  }
  return {
    label: "Review Required",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
  };
}

function formatScore(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

export default function ConfidenceBadge({ score, dimensions, className = "" }: ConfidenceBadgeProps): ReactNode {
  const { label, color, bg, border } = getConfidenceLabel(score);

  return (
    <motion.div
      initial={false}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border ${bg} ${border} ${className}`}
      title={
        dimensions
          ? Object.entries(dimensions)
              .map(([k, v]) => `${k}: ${formatScore(v)}`)
              .join("\n")
          : `Confidence: ${formatScore(score)}`
      }
    >
      <span className={`text-xs font-semibold tracking-wide ${color}`}>{label}</span>
      <span className={`text-[11px] font-mono ${color} opacity-70`}>{formatScore(score)}</span>
    </motion.div>
  );
}
