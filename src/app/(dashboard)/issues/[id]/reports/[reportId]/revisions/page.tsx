"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Revision } from "@/lib/types";
import DiffViewer from "@/components/DiffViewer";

export default function RevisionsPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [sections, setSections] = useState<string[]>([]);
  const [parties, setParties] = useState<string[]>([]);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/reports/${reportId}/revisions`);
      if (!res.ok) throw new Error("Failed to load revisions");
      const data = await res.json();
      setRevisions(data.revisions ?? []);
      setSections(data.sections ?? []);
      setParties(data.parties ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revisions");
    } finally {
      setLoading(false);
    }
  }, [issueId, reportId]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const filtered = revisions.filter((r) => {
    if (sectionFilter !== "all" && r.section_id !== sectionFilter) return false;
    if (partyFilter !== "all" && r.party !== partyFilter) return false;
    return true;
  });

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
            <button onClick={fetchRevisions} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}/reports/${reportId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Report
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Revision Browser</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">{revisions.length} revision{revisions.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {sections.length > 0 && (
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] bg-[#112F5A] border border-[rgba(255,255,255,0.08)] rounded-[8px] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200"
            >
              <option value="all">All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          {parties.length > 0 && (
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] bg-[#112F5A] border border-[rgba(255,255,255,0.08)] rounded-[8px] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200"
            >
              <option value="all">All Parties</option>
              {parties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>

        {revisions.length === 0 || filtered.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No revisions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-2">
              {filtered.map((revision, idx) => (
                <motion.button
                  key={revision.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  onClick={() => setSelectedRevision(revision)}
                  className={`w-full text-left px-4 py-3 rounded-[8px] border transition-colors duration-200 ${
                    selectedRevision?.id === revision.id
                      ? "border-[#1E6FE8] bg-[#1E6FE8]/10"
                      : "border-[rgba(255,255,255,0.08)] bg-[#0B2345] hover:bg-[#112F5A]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white">Revision #{revision.revision_number}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] ${
                      revision.status === "accepted" ? "text-green-400 bg-green-500/10" : "text-amber-400 bg-amber-500/10"
                    }`}>
                      {revision.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7D8DA0]">
                    {revision.party} &middot; Section {(revision.section_id ?? "").slice(0, 12)}
                  </p>
                  <p className="text-[10px] text-[#7D8DA0] mt-1">
                    {new Date(revision.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </motion.button>
              ))}
            </div>

            <div className="lg:col-span-2">
              {selectedRevision ? (
                <DiffViewer
                  original={selectedRevision.original_text}
                  revised={selectedRevision.revised_text}
                  title={`Revision #${selectedRevision.revision_number} - ${selectedRevision.party}`}
                />
              ) : (
                <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
                  <p className="text-sm text-[#7D8DA0]">Select a revision to view the diff</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
