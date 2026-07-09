"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReportVersion } from "@/lib/types";
import ConfidenceBadge from "@/components/ConfidenceBadge";

interface ReportListItem {
  id: string;
  version: number;
  status: string;
  confidence: number;
  executive_summary: string;
  created_at: string;
}

export default function ReportsListPage(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");

  useEffect(() => {
    fetchReports();
  }, [issueId]);

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports`);
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data.reports ?? []);
      setIssueTitle(data.issueTitle ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start generation");
      const data = await res.json();
      router.push(`/dashboard/issues/${issueId}/pipeline`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  function getStatusBadge(status: string): { label: string; color: string; bg: string } {
    switch (status) {
      case "draft": return { label: "Draft", color: "text-gray-400", bg: "bg-gray-500/10" };
      case "generating": return { label: "Generating", color: "text-[#6CA9FF]", bg: "bg-[#1E6FE8]/10" };
      case "review": return { label: "Review", color: "text-amber-400", bg: "bg-amber-500/10" };
      case "correction": return { label: "Corrections", color: "text-orange-400", bg: "bg-orange-500/10" };
      case "approved": return { label: "Approved", color: "text-green-400", bg: "bg-green-500/10" };
      case "published": return { label: "Published", color: "text-green-400", bg: "bg-green-500/10" };
      default: return { label: status, color: "text-[#B6C3D1]", bg: "bg-[#112F5A]" };
    }
  }

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

  if (error) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchReports}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...reports].sort((a, b) => b.version - a.version);

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 mb-1 inline-block"
            >
              &larr; Back to Issue
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              {issueTitle || `Issue Reports`}
            </h1>
            <p className="text-sm text-[#B6C3D1] mt-1">
              {reports.length} version{reports.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generate New Report
              </>
            )}
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No reports yet</p>
            <p className="text-xs text-[#7D8DA0] mt-2">Click &quot;Generate New Report&quot; to start the AI pipeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((report, idx) => {
              const badge = getStatusBadge(report.status);
              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                >
                  <Link
                    href={`/dashboard/issues/${issueId}/reports/${report.id}`}
                    className="block rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-5 hover:bg-[#112F5A] transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-sm font-bold text-white">Version {report.version}</span>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${badge.bg} ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        {report.executive_summary && (
                          <p className="text-xs text-[#B6C3D1] leading-relaxed line-clamp-2">
                            {report.executive_summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ConfidenceBadge score={report.confidence} />
                        <span className="text-xs text-[#7D8DA0]">
                          {new Date(report.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
