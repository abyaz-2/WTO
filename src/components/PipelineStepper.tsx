"use client";

import type { ReactNode } from "react";
import type { PipelineStage, PipelineStatus } from "@/lib/types";
import { motion } from "framer-motion";

interface PipelineStep {
  stage: PipelineStage;
  label: string;
  icon: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  { stage: "collect", label: "Collect", icon: "📄" },
  { stage: "normalize", label: "Normalize", icon: "🔧" },
  { stage: "extract_facts", label: "Extract Facts", icon: "🔍" },
  { stage: "retrieve_law", label: "Retrieve WTO Law", icon: "⚖️" },
  { stage: "analyze_claims", label: "Analyze Claims", icon: "📊" },
  { stage: "draft_intro", label: "Draft Introduction", icon: "✏️" },
  { stage: "draft_factual", label: "Draft Factual", icon: "📝" },
  { stage: "draft_analysis", label: "Draft Analysis", icon: "📋" },
  { stage: "draft_findings", label: "Draft Findings", icon: "✅" },
  { stage: "draft_recommendations", label: "Draft Recommendations", icon: "📌" },
];

interface PipelineStepperProps {
  stages: Record<PipelineStage, PipelineStatus>;
  progress: number;
  tokenUsage: number;
  costEstimate: number;
}

function getStatusConfig(status: PipelineStatus): { border: string; bg: string; dot: string; text: string } {
  switch (status) {
    case "completed":
      return {
        border: "border-green-500/40",
        bg: "bg-green-500/15",
        dot: "bg-green-400",
        text: "text-green-400",
      };
    case "running":
      return {
        border: "border-[#1E6FE8]/40",
        bg: "bg-[#1E6FE8]/15",
        dot: "bg-[#1E6FE8]",
        text: "text-[#6CA9FF]",
      };
    case "failed":
      return {
        border: "border-red-500/40",
        bg: "bg-red-500/15",
        dot: "bg-red-400",
        text: "text-red-400",
      };
    default:
      return {
        border: "border-[rgba(255,255,255,0.08)]",
        bg: "bg-transparent",
        dot: "bg-[#3A4B60]",
        text: "text-[#7D8DA0]",
      };
  }
}

export default function PipelineStepper({
  stages,
  progress,
  tokenUsage,
  costEstimate,
}: PipelineStepperProps): ReactNode {
  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-white tracking-tight">Pipeline Progress</h2>
        <div className="flex items-center gap-4">
          <div className="text-xs text-[#7D8DA0]">
            <span className="text-[#B6C3D1] font-medium">{tokenUsage.toLocaleString()}</span> tokens
          </div>
          <div className="text-xs text-[#7D8DA0]">
            ~<span className="text-[#B6C3D1] font-medium">${costEstimate.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="w-full h-2 bg-[#112F5A] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#1E6FE8] to-[#6CA9FF] rounded-full"
          />
        </div>
        <span className="block text-right text-xs text-[#7D8DA0] mt-1.5">{Math.round(progress)}%</span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {PIPELINE_STEPS.map((step, idx) => {
          const status = stages[step.stage] ?? "pending";
          const config = getStatusConfig(status);
          const isRunning = status === "running";

          return (
            <motion.div
              key={step.stage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-[8px] border ${config.border} ${config.bg} transition-colors duration-300`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${config.dot} ${status === "running" ? "animate-pulse" : ""}`}>
                {status === "completed" ? (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="text-white text-[10px]">{step.icon}</span>
                )}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${config.text}`}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
