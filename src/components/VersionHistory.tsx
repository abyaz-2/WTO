"use client";

import type { ReactNode } from "react";
import type { ReportVersion } from "@/lib/types";
import { motion } from "framer-motion";
import ConfidenceBadge from "./ConfidenceBadge";
import Link from "next/link";

interface VersionHistoryProps {
  versions: ReportVersion[];
  currentVersionId?: string;
  reportId: string;
  issueId: string;
}

function getStatusBadge(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case "draft":
      return { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/10" };
    case "generating":
      return { label: "Generating", color: "text-[#6CA9FF]", bg: "bg-[#1E6FE8]/10" };
    case "review":
      return { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10" };
    case "correction":
      return { label: "Corrections", color: "text-orange-400", bg: "bg-orange-500/10" };
    case "approved":
      return { label: "Approved", color: "text-green-400", bg: "bg-green-500/10" };
    case "published":
      return { label: "Published", color: "text-green-400", bg: "bg-green-500/10" };
    default:
      return { label: status, color: "text-[#B6C3D1]", bg: "bg-[#112F5A]" };
  }
}

export default function VersionHistory({
  versions,
  currentVersionId,
  reportId,
  issueId,
}: VersionHistoryProps): ReactNode {
  if (versions.length === 0) {
    return (
      <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6">
        <p className="text-sm text-[#7D8DA0] text-center">No versions available</p>
      </div>
    );
  }

  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
        <h3 className="text-sm font-semibold text-white tracking-tight">Version History</h3>
      </div>
      <div className="divide-y divide-[rgba(255,255,255,0.06)]">
        {sorted.map((version, idx) => {
          const badge = getStatusBadge(version.status);
          const isCurrent = version.id === currentVersionId;

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.2 }}
              className={`px-6 py-4 flex items-center justify-between ${isCurrent ? "bg-[#1E6FE8]/5 border-l-2 border-l-[#1E6FE8]" : ""}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">v{version.version}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-[#6CA9FF] bg-[#1E6FE8]/10 px-1.5 py-0.5 rounded-[4px]">
                      Current
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${badge.bg} ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-xs text-[#7D8DA0]">
                  {new Date(version.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <ConfidenceBadge score={version.confidence.overall} dimensions={version.confidence.dimensions} className="scale-[0.85]" />
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/issues/${issueId}/reports/${reportId}`}
                  className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] rounded-[6px] transition-colors duration-200"
                >
                  View
                </Link>
                {idx < sorted.length - 1 && (
                  <button
                    className="px-3 py-1.5 text-xs font-medium text-[#6CA9FF] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[#6CA9FF] rounded-[6px] transition-colors duration-200"
                  >
                    Diff
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
