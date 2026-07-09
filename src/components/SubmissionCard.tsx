"use client";

import { motion } from "framer-motion";
import type { Submission } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

interface SubmissionCardProps {
  submission: Submission;
  onEdit?: (id: string) => void;
  onSubmit?: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  initial_submission: "Initial Submission",
  response: "Response",
  rebuttal: "Rebuttal",
  supplemental: "Supplemental",
  final_argument: "Final Argument",
  other: "Other",
};

function formatContent(content?: Record<string, unknown>): string {
  if (!content) return "No content";
  const text = Object.values(content)
    .filter((v): v is string => typeof v === "string")
    .join("\n\n");
  return text || "No content";
}

export default function SubmissionCard({ submission, onEdit, onSubmit }: SubmissionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#6CA9FF]">
              {typeLabels[submission.submission_type] ?? submission.submission_type}
            </span>
            <StatusBadge status={submission.status} variant="sm" />
          </div>
          {submission.submitted_at && (
            <span className="text-xs text-[#7D8DA0]">
              {new Date(submission.submitted_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-[#B6C3D1] whitespace-pre-wrap leading-relaxed">
          {formatContent(submission.content)}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
          <span className="text-xs text-[#7D8DA0]">
            Version {submission.content?.version ?? 1}
          </span>
          <div className="flex gap-2">
            {submission.status === "draft" && (
              <>
                {onEdit && (
                  <button
                    onClick={() => onEdit(submission.id)}
                    className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] border border-[rgba(255,255,255,0.16)] rounded-[6px] hover:text-white hover:border-[rgba(255,255,255,0.3)] transition-colors"
                  >
                    Edit
                  </button>
                )}
                {onSubmit && (
                  <button
                    onClick={() => onSubmit(submission.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-[#1E6FE8] rounded-[6px] hover:bg-[#1A5FC8] transition-colors"
                  >
                    Submit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
