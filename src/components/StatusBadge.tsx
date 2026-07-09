"use client";

import type { IssueStatus } from "@/lib/types";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  status: IssueStatus | string;
  variant?: "sm" | "md" | "lg";
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  draft: {
    bg: "bg-[rgba(125,141,160,0.15)]",
    text: "text-[#B6C3D1]",
    border: "border-[rgba(125,141,160,0.25)]",
  },
  submitted: {
    bg: "bg-[rgba(30,111,232,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(30,111,232,0.25)]",
  },
  under_review: {
    bg: "bg-[rgba(108,169,255,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(108,169,255,0.25)]",
  },
  rejected: {
    bg: "bg-[rgba(239,68,68,0.15)]",
    text: "text-[#EF4444]",
    border: "border-[rgba(239,68,68,0.25)]",
  },
  approved: {
    bg: "bg-[rgba(34,197,94,0.15)]",
    text: "text-[#22C55E]",
    border: "border-[rgba(34,197,94,0.25)]",
  },
  published: {
    bg: "bg-[rgba(34,197,94,0.15)]",
    text: "text-[#22C55E]",
    border: "border-[rgba(34,197,94,0.25)]",
  },
  registration_open: {
    bg: "bg-[rgba(234,179,8,0.15)]",
    text: "text-[#EAB308]",
    border: "border-[rgba(234,179,8,0.25)]",
  },
  registration_closed: {
    bg: "bg-[rgba(125,141,160,0.15)]",
    text: "text-[#7D8DA0]",
    border: "border-[rgba(125,141,160,0.25)]",
  },
  submission_phase: {
    bg: "bg-[rgba(30,111,232,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(30,111,232,0.25)]",
  },
  evidence_phase: {
    bg: "bg-[rgba(30,111,232,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(30,111,232,0.25)]",
  },
  ai_processing: {
    bg: "bg-[rgba(168,85,247,0.15)]",
    text: "text-[#A855F7]",
    border: "border-[rgba(168,85,247,0.25)]",
  },
  eb_review: {
    bg: "bg-[rgba(30,111,232,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(30,111,232,0.25)]",
  },
  fact_checking: {
    bg: "bg-[rgba(234,179,8,0.15)]",
    text: "text-[#EAB308]",
    border: "border-[rgba(234,179,8,0.25)]",
  },
  final_revision: {
    bg: "bg-[rgba(30,111,232,0.15)]",
    text: "text-[#6CA9FF]",
    border: "border-[rgba(30,111,232,0.25)]",
  },
  final_published: {
    bg: "bg-[rgba(34,197,94,0.15)]",
    text: "text-[#22C55E]",
    border: "border-[rgba(34,197,94,0.25)]",
  },
  archived: {
    bg: "bg-[rgba(125,141,160,0.10)]",
    text: "text-[#7D8DA0]",
    border: "border-[rgba(125,141,160,0.15)]",
  },
};

const variantStyles = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, variant = "sm" }: StatusBadgeProps) {
  const colors = statusColors[status] ?? statusColors.draft;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${variantStyles[variant]}`}
    >
      {formatStatusLabel(status)}
    </motion.span>
  );
}
