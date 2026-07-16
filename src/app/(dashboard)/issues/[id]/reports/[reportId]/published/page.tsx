"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ReportVersion, ReportSection } from "@/lib/types";
import PublicationCertificate from "@/components/PublicationCertificate";

interface PublishedInfo {
  publicationDate: string;
  panelMembers: string[];
  sha256Hash: string;
  certificateNumber: string;
}

export default function PublishedReportPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [report, setReport] = useState<ReportVersion | null>(null);
  const [publishedInfo, setPublishedInfo] = useState<PublishedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlDownloading, setHtmlDownloading] = useState(false);

  useEffect(() => {
    fetchPublished();
  }, [issueId, reportId]);

  async function fetchPublished() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/published`);
      if (!res.ok) throw new Error("Failed to load published report");
      const data = await res.json();
      setReport(data.report ?? null);
      setPublishedInfo(data.publishedInfo ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load published report");
    } finally {
      setLoading(false);
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
      a.download = `WTO-DSB-${issueId}-published.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("PDF download not available.");
    }
  }

  async function downloadHTML() {
    setHtmlDownloading(true);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/html`);
      if (!res.ok) throw new Error("HTML not available");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WTO-DSB-${issueId}-published.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("HTML download not available.");
    } finally {
      setHtmlDownloading(false);
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
            <button onClick={fetchPublished} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
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
            <p className="text-sm text-[#7D8DA0]">Published report not found</p>
          </div>
        </div>
      </div>
    );
  }

  const sections = report.sections ?? [];

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Issue
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Published Report &mdash; WTO/DS/{issueId}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPDF}
              className="px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={downloadHTML}
              disabled={htmlDownloading}
              className="px-4 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] rounded-[8px] transition-colors duration-200 flex items-center gap-1.5"
            >
              {htmlDownloading ? "Downloading..." : "Download HTML"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#112F5A] border-2 border-[rgba(255,255,255,0.16)] flex items-center justify-center">
                <span className="text-lg font-bold text-white">WTO</span>
              </div>
              <h2 className="text-base font-bold text-white">WORLD TRADE ORGANIZATION</h2>
              <p className="text-xs text-[#7D8DA0] mt-1">Dispute Settlement Body</p>
              <p className="text-sm text-[#B6C3D1] mt-4 font-medium">WT/DS/{issueId}/R</p>
              <p className="text-xs text-[#7D8DA0] mt-1">
                {publishedInfo?.publicationDate
                  ? new Date(publishedInfo.publicationDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </p>
            </div>

            <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6">
              <nav className="space-y-1">
                <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-2">Table of Contents</p>
                <p className="text-xs text-[#B6C3D1]">Executive Summary</p>
                {sections.map((s, idx) => (
                  <p key={s.id} className="text-xs text-[#6CA9FF]">
                    {idx + 1}. {s.title}
                  </p>
                ))}
              </nav>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white tracking-tight">Executive Summary</h2>
                <span className="text-[10px] font-mono text-[#7D8DA0]">Ver. {report.version}</span>
              </div>
              <p className="text-sm text-[#B6C3D1] leading-relaxed">{report.executive_summary}</p>
            </motion.div>

            {sections.map((section, idx) => (
              <div
                key={section.id}
                id={`section-${section.id}`}
                className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
                  <h3 className="text-sm font-semibold text-white">{idx + 1}. {section.title}</h3>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                  {section.citations && section.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-2">Citations</p>
                      {section.citations.map((citation) => (
                        <p key={citation.id} className="text-[11px] text-[#6CA9FF] leading-relaxed">
                          {citation.source}
                          {citation.url && (
                            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="ml-1 underline opacity-70 hover:opacity-100">
                              [Link]
                            </a>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            {publishedInfo && (
              <div className="sticky top-8">
                <PublicationCertificate
                  disputeNumber={`WT/DS/${issueId}/R`}
                  disputeTitle={report.executive_summary?.slice(0, 100) ?? ""}
                  publicationDate={publishedInfo.publicationDate}
                  panelMembers={publishedInfo.panelMembers}
                  sha256Hash={publishedInfo.sha256Hash}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
