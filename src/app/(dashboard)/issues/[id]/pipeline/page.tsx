"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { PipelineStage, PipelineStatus } from "@/lib/types";
import PipelineStepper from "@/components/PipelineStepper";

interface PipelineState {
  stages: Record<PipelineStage, PipelineStatus>;
  progress: number;
  token_usage: number;
  cost_estimate: number;
  estimated_time_remaining: number;
  error?: string;
  report_id?: string;
}

const ALL_STAGES: PipelineStage[] = [
  "collect",
  "normalize",
  "extract_facts",
  "retrieve_law",
  "analyze_claims",
  "draft_intro",
  "draft_factual",
  "draft_analysis",
  "draft_findings",
  "draft_recommendations",
];

const STAGE_LABELS: Record<PipelineStage, string> = {
  collect: "Collect Documents",
  normalize: "Normalize Data",
  extract_facts: "Extract Facts",
  retrieve_law: "Retrieve WTO Law",
  analyze_claims: "Analyze Claims",
  draft_intro: "Draft Introduction",
  draft_factual: "Draft Factual Aspects",
  draft_analysis: "Draft Legal Analysis",
  draft_findings: "Draft Findings",
  draft_recommendations: "Draft Recommendations",
};

export default function PipelinePage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;

  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/issues/${issueId}/pipeline`);
      if (!res.ok) throw new Error("Failed to load pipeline status");
      const data = await res.json();
      setPipeline(data);
      setIsActive(
        (Object.values(data.stages ?? {}) as PipelineStatus[]).some(
          (s) => s === "running" || s === "pending"
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(fetchPipeline, 5000);
    return () => clearInterval(interval);
  }, [isActive, fetchPipeline]);

  async function retryStage(stage: PipelineStage) {
    try {
      const res = await fetch(`/api/issues/${issueId}/pipeline/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("Failed to retry stage");
      fetchPipeline();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry");
    }
  }

  function viewReport() {
    if (pipeline?.report_id) {
      router.push(`/dashboard/issues/${issueId}/reports/${pipeline.report_id}`);
    }
  }

  const currentStage = pipeline
    ? ALL_STAGES.find((s) => pipeline.stages[s] === "running") ?? null
    : null;

  const failedStage = pipeline
    ? ALL_STAGES.find((s) => pipeline.stages[s] === "failed") ?? null
    : null;

  const timeRemaining = pipeline?.estimated_time_remaining ?? 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  if (loading) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !pipeline) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchPipeline}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No active pipeline</p>
            <Link
              href={`/dashboard/issues/${issueId}/reports`}
              className="mt-3 inline-block px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Go to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allCompleted = Object.values(pipeline.stages).every((s) => s === "completed");
  const anyRunning = Object.values(pipeline.stages).some((s) => s === "running");

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Issue
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">AI Pipeline</h1>
          </div>
          {allCompleted && pipeline.report_id && (
            <button
              onClick={viewReport}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-[8px] hover:bg-green-700 transition-colors duration-200"
            >
              View Generated Report
            </button>
          )}
        </div>

        <div className="space-y-6">
          <PipelineStepper
            stages={pipeline.stages}
            progress={pipeline.progress}
            tokenUsage={pipeline.token_usage}
            costEstimate={pipeline.cost_estimate}
          />

          {currentStage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[12px] border border-[#1E6FE8]/30 bg-[#1E6FE8]/5 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin" />
                <div>
                  <p className="text-sm font-medium text-[#6CA9FF]">
                    {STAGE_LABELS[currentStage]}
                  </p>
                  <p className="text-xs text-[#7D8DA0] mt-0.5">
                    Estimated {minutes}m {seconds}s remaining
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {failedStage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[12px] border border-red-500/30 bg-red-500/5 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Error in: {STAGE_LABELS[failedStage]}
                  </p>
                  {pipeline.error && (
                    <p className="text-xs text-red-300 mt-1">{pipeline.error}</p>
                  )}
                </div>
                <button
                  onClick={() => retryStage(failedStage)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-[8px] hover:bg-red-700 transition-colors duration-200 shrink-0"
                >
                  Retry Stage
                </button>
              </div>
            </motion.div>
          )}

          {!anyRunning && !allCompleted && !failedStage && (
            <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6 text-center">
              <p className="text-sm text-[#7D8DA0]">
                Pipeline is idle.{" "}
                <Link
                  href={`/dashboard/issues/${issueId}/reports`}
                  className="text-[#6CA9FF] hover:text-white transition-colors duration-200"
                >
                  Generate a new report
                </Link>{" "}
                to start.
              </p>
            </div>
          )}

          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[12px] border border-green-500/30 bg-green-500/5 p-6 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-green-400">Pipeline Complete</p>
              <p className="text-sm text-[#B6C3D1] mt-1">
                Used {pipeline.token_usage.toLocaleString()} tokens (${pipeline.cost_estimate.toFixed(2)})
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
