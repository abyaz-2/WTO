"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReportVersion } from "@/lib/types";
import ReportSectionComponent from "@/components/ReportSection";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import VersionHistory from "@/components/VersionHistory";

type UserRole = "executive_board" | "delegate";

export default function ReportDetailPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [report, setReport] = useState<ReportVersion | null>(null);
  const [versions, setVersions] = useState<ReportVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [sendingFactCheck, setSendingFactCheck] = useState(false);

  useEffect(() => {
    fetchReport();
    fetchUserRole();
  }, [issueId, reportId]);

  async function fetchUserRole() {
    try {
      const res = await fetch("/api/v1/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setUserRole(data.role ?? null);
    } catch {
      // ignore
    }
  }

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();
      setReport(data.report ?? null);
      setVersions(data.versions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  async function sendToFactCheck() {
    setSendingFactCheck(true);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/fact-checks`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to send to fact checking");
      fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send to fact checking");
    } finally {
      setSendingFactCheck(false);
    }
  }

  async function downloadPDF() {
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/pdf`);
      if (!res.ok) throw new Error("PDF not available");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-v${report?.version}-${issueId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("PDF download not available. Ensure the report is generated.");
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

  if (error && !report) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchReport}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Retry
            </button>
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

  const isEB = userRole === "executive_board";

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}/reports`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Reports
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Version {report.version} Report
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] rounded-[8px] transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            {isEB && report.status !== "published" && (
              <>
                <Link
                  href={`/dashboard/issues/${issueId}/reports/${reportId}/edit`}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
                >
                  Edit
                </Link>
                {report.status !== "review" && (
                  <button
                    onClick={sendToFactCheck}
                    disabled={sendingFactCheck}
                    className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-[8px] hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {sendingFactCheck ? "Sending..." : "Send to Fact Checking"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white tracking-tight">Executive Summary</h2>
                <ConfidenceBadge score={report.confidence.overall} dimensions={report.confidence.dimensions} />
              </div>
              <p className="text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap">
                {report.executive_summary}
              </p>
            </motion.div>

            {report.sections.map((section) => (
              <ReportSectionComponent
                key={section.id}
                section={section}
                editable={isEB}
              />
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <VersionHistory
              versions={versions}
              currentVersionId={report.id}
              reportId={reportId}
              issueId={issueId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
