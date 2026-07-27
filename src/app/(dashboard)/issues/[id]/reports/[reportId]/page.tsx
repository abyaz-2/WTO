"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReportVersion } from "@/lib/types";
import ReportSectionComponent from "@/components/ReportSection";
import VersionHistory from "@/components/VersionHistory";
import ImportReportDialog from "@/components/ImportReportDialog";

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
  const [showImport, setShowImport] = useState(false);

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

  async function handleImport(content: string) {
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: {
            sections: [
              {
                id: "imported",
                type: "findings",
                title: "Panel Report",
                content,
                citations: [],
                editable: true,
                word_count: content.split(/\s+/).length,
              },
            ],
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to import report");
      setShowImport(false);
      fetchReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import report");
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
            {isEB && report.status === "draft" && (
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
              >
                Import AI Result
              </button>
            )}
            {isEB && report.status !== "published" && report.status !== "draft" && (
              <Link
                href={`/dashboard/issues/${issueId}/reports/${reportId}/edit`}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {report.executive_summary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6"
              >
                <h2 className="text-sm font-semibold text-white tracking-tight mb-3">Executive Summary</h2>
                <p className="text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap">
                  {report.executive_summary}
                </p>
              </motion.div>
            )}

            {report.sections?.map((section) => (
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

        <ImportReportDialog
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          onSubmit={handleImport}
        />
      </div>
    </div>
  );
}