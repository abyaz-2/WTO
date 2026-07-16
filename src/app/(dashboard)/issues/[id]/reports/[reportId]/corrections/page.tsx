"use client";

import { useState, useEffect, useCallback, type ReactNode, type FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { CorrectionRequest as CorrectionRequestType, CorrectionStatus } from "@/lib/types";

type FilterMode = "all" | "pending" | "accepted" | "rejected";

export default function CorrectionsDashboardPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [corrections, setCorrections] = useState<CorrectionRequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [parties, setParties] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/fact-checks`);
      if (!res.ok) throw new Error("Failed to load corrections");
      const data = await res.json();
      setCorrections(data.corrections ?? []);
      setParties(data.parties ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load corrections");
    } finally {
      setLoading(false);
    }
  }, [issueId, reportId]);

  useEffect(() => {
    fetchCorrections();
  }, [fetchCorrections]);

  async function handleAction(correctionId: string, action: "accepted" | "rejected") {
    setActionLoading(correctionId);
    try {
      const body: Record<string, string> = { action };
      if (action === "rejected" && rejectNote.trim()) {
        body.eb_note = rejectNote.trim();
      }
      const res = await fetch(
        `/api/v1/issues/${issueId}/ai-reports/${reportId}/fact-checks/${correctionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Failed to update correction");
      setRejectingId(null);
      setRejectNote("");
      fetchCorrections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusStyle(status: CorrectionStatus): string {
    switch (status) {
      case "pending": return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "accepted": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "rejected": return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  }

  const filtered = corrections.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (partyFilter !== "all" && c.party !== partyFilter) return false;
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
            <button onClick={fetchCorrections} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
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
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">Corrections Dashboard</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">
              {corrections.length} correction{corrections.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center bg-[#112F5A] rounded-[8px] p-0.5">
            {(["all", "pending", "accepted", "rejected"] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-200 capitalize ${
                  filter === f ? "bg-[#1E6FE8] text-white" : "text-[#7D8DA0] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
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

        {corrections.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No correction requests</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No corrections match the current filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((correction, idx) => (
              <motion.div
                key={correction.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-white bg-[#112F5A] px-2 py-1 rounded-[4px]">
                      {correction.party}
                    </span>
                    <span className="text-xs text-[#7D8DA0]">
                      Section {(correction.section_id ?? "").slice(0, 8)}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-[4px] border ${getStatusStyle(correction.status)}`}>
                      {correction.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#7D8DA0]">
                    {new Date(correction.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-1">Original</p>
                    <div className="p-3 text-xs text-[#B6C3D1] bg-[#05162D] rounded-[8px] border border-red-500/10 leading-relaxed">
                      {correction.original_text}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-1">Proposed</p>
                    <div className="p-3 text-xs text-[#B6C3D1] bg-[#05162D] rounded-[8px] border border-green-500/10 leading-relaxed">
                      {correction.proposed_text}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-3">
                  <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-1">Justification</p>
                  <p className="text-xs text-[#B6C3D1] leading-relaxed">{correction.justification}</p>
                </div>

                {correction.status === "pending" && (
                  <div className="px-6 py-4 border-t border-[rgba(255,255,255,0.08)] bg-[#05162D]">
                    <AnimatePresence>
                      {rejectingId === correction.id ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-col gap-3"
                        >
                          <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Note to party explaining rejection..."
                            rows={2}
                            className="w-full px-3 py-2 text-xs text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[6px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200 resize-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAction(correction.id, "accepted")}
                              disabled={actionLoading === correction.id}
                              className="px-4 py-2 text-xs font-semibold text-white bg-green-600 rounded-[6px] hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
                            >
                              {actionLoading === correction.id ? "Processing..." : "Accept"}
                            </button>
                            <button
                              onClick={() => handleAction(correction.id, "rejected")}
                              disabled={actionLoading === correction.id}
                              className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-[6px] hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
                            >
                              {actionLoading === correction.id ? "Processing..." : "Reject with Note"}
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectNote(""); }}
                              className="px-3 py-2 text-xs text-[#B6C3D1] hover:text-white transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(correction.id, "accepted")}
                            disabled={actionLoading === correction.id}
                            className="px-4 py-2 text-xs font-semibold text-white bg-green-600 rounded-[6px] hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
                          >
                            {actionLoading === correction.id ? "Processing..." : "Accept"}
                          </button>
                          <button
                            onClick={() => setRejectingId(correction.id)}
                            className="px-4 py-2 text-xs font-medium text-red-400 border border-red-500/30 rounded-[6px] hover:bg-red-500/10 transition-colors duration-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {correction.status === "rejected" && correction.eb_note && (
                  <div className="px-6 py-3 border-t border-[rgba(255,255,255,0.08)] bg-red-500/5">
                    <p className="text-[11px] font-medium text-red-400 mb-0.5">EB Note:</p>
                    <p className="text-xs text-red-300">{correction.eb_note}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
