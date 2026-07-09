"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReportVersion, ReportSection } from "@/lib/types";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import CorrectionRequest from "@/components/CorrectionRequest";

interface PartyStatus {
  party: string;
  status: "pending" | "approved" | "correction_requested";
  submitted_at?: string;
}

export default function ReviewPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [report, setReport] = useState<ReportVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyStatuses, setPartyStatuses] = useState<PartyStatus[]>([]);
  const [userParty, setUserParty] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedSectionTitle, setSelectedSectionTitle] = useState("");
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportRes, statusRes] = await Promise.all([
        fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}`),
        fetch(`/api/issues/${issueId}/reports/${reportId}/review/status`),
      ]);
      if (!reportRes.ok || !statusRes.ok) throw new Error("Failed to load review data");
      const reportData = await reportRes.json();
      const statusData = await statusRes.json();
      setReport(reportData.report);
      setPartyStatuses(statusData.parties ?? []);
      setUserParty(statusData.userParty ?? "");
      setDeadline(statusData.deadline ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [issueId, reportId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function submitApproval() {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/issues/${issueId}/reports/${reportId}/review/approve`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to submit approval");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const text = selection.toString().trim();
    if (!text) return;

    setSelectedText(text);

    const parentSection = (selection.anchorNode as Node)?.parentElement?.closest("[data-section-id]");
    const sectionTitle = parentSection?.getAttribute("data-section-title") ?? "Unknown section";
    setSelectedSectionTitle(sectionTitle);
    setCorrectionOpen(true);
  }

  async function handleCorrectionSubmit(data: { proposedRevision: string; justification: string }) {
    setCorrectionSubmitting(true);
    try {
      const res = await fetch(
        `/api/issues/${issueId}/reports/${reportId}/corrections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalText: selectedText,
            proposedText: data.proposedRevision,
            justification: data.justification,
            party: userParty,
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit correction");
      setCorrectionOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction");
    } finally {
      setCorrectionSubmitting(false);
    }
  }

  function getDeadlineInfo(): { color: string; label: string } {
    if (!deadline) return { color: "text-[#7D8DA0]", label: "No deadline set" };
    const now = Date.now();
    const deadlineTime = new Date(deadline).getTime();
    const diff = deadlineTime - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (diff <= 0) return { color: "text-red-400", label: "Overdue" };
    if (days <= 2) return { color: "text-red-400", label: `${days} day${days !== 1 ? "s" : ""} remaining` };
    if (days <= 5) return { color: "text-amber-400", label: `${days} days remaining` };
    return { color: "text-green-400", label: `${days} days remaining` };
  }

  const userStatus = partyStatuses.find((p) => p.party === userParty);

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

  if (error && !report) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={fetchData} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">Report not found</p>
          </div>
        </div>
      </div>
    );
  }

  const deadlineInfo = getDeadlineInfo();

  return (
    <div className="p-8 sm:p-12" onMouseUp={handleTextSelection}>
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}/reports/${reportId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Report
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Party Review &mdash; Version {report.version}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={`text-xs font-medium ${deadlineInfo.color}`}>{deadlineInfo.label}</p>
              <p className="text-[10px] text-[#7D8DA0]">Review Deadline</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCorrectionOpen(true)}
                disabled={!selectedText}
                className="px-4 py-2 text-xs font-medium text-amber-400 border border-amber-500/30 rounded-[8px] hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Request Correction
              </button>
              <button
                onClick={submitApproval}
                disabled={submitting || userStatus?.status === "approved"}
                className="px-4 py-2 text-xs font-semibold text-white bg-green-600 rounded-[8px] hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {submitting ? "Submitting..." : userStatus?.status === "approved" ? "Approved" : "Submit Approval"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white tracking-tight">Executive Summary</h2>
                <ConfidenceBadge score={report.confidence.overall} dimensions={report.confidence.dimensions} />
              </div>
              <p className="text-sm text-[#B6C3D1] leading-relaxed">{report.executive_summary}</p>
            </motion.div>

            {report.sections.map((section) => (
              <div
                key={section.id}
                data-section-id={section.id}
                data-section-title={section.title}
                className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                  <ConfidenceBadge score={section.confidence} />
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap select-text">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-5">
              <h3 className="text-xs font-semibold text-white tracking-tight mb-3">Party Status</h3>
              {partyStatuses.length === 0 ? (
                <p className="text-xs text-[#7D8DA0]">No parties assigned</p>
              ) : (
                <div className="space-y-2">
                  {partyStatuses.map((ps) => {
                    const isYou = ps.party === userParty;
                    const statusColors: Record<string, string> = {
                      pending: "text-[#7D8DA0] bg-[#112F5A]",
                      approved: "text-green-400 bg-green-500/10",
                      correction_requested: "text-amber-400 bg-amber-500/10",
                    };
                    const statusLabel: Record<string, string> = {
                      pending: "Pending",
                      approved: "Approved",
                      correction_requested: "Correction Requested",
                    };
                    return (
                      <div
                        key={ps.party}
                        className={`flex items-center justify-between py-2 px-3 rounded-[6px] ${
                          isYou ? "bg-[#112F5A] border border-[rgba(255,255,255,0.08)]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white">{ps.party}</span>
                          {isYou && <span className="text-[10px] text-[#6CA9FF]">(you)</span>}
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] ${statusColors[ps.status]}`}>
                          {statusLabel[ps.status]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-5">
              <p className="text-xs text-[#7D8DA0]">
                Select any text in the report and click &quot;Request Correction&quot; to submit a correction request.
              </p>
            </div>
          </div>
        </div>

        <CorrectionRequest
          selectedText={selectedText}
          sectionTitle={selectedSectionTitle}
          isOpen={correctionOpen}
          onClose={() => {
            setCorrectionOpen(false);
            setSelectedText("");
          }}
          onSubmit={handleCorrectionSubmit}
          submitting={correctionSubmitting}
        />
      </div>
    </div>
  );
}
