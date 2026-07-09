"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

interface ArchiveItem {
  id: string;
  number: string;
  title: string;
  parties: string[];
  published_at: string;
  archived_at: string;
}

interface ArchiveResponse {
  disputes: ArchiveItem[];
  total: number;
  page: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 12;

export default function ArchivePage(): ReactNode {
  const [data, setData] = useState<ArchiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/archive?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load archive");
      const data = await res.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchArchive();
  }

  if (loading && !data) {
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

  if (error && !data) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={fetchArchive} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const disputes = data?.disputes ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Archive</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">
              {total} archived dispute{total !== 1 ? "s" : ""}
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search disputes..."
              className="w-64 px-4 py-2 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Search
            </button>
          </form>
        </div>

        {disputes.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">
              {search.trim() ? "No disputes match your search" : "No archived disputes"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {disputes.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
              >
                <Link
                  href={`/dashboard/issues/${item.id}/reports/${item.id}/published`}
                  className="block rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-5 hover:bg-[#112F5A] transition-colors duration-200 h-full"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono text-[#6CA9FF] bg-[#1E6FE8]/10 px-2 py-0.5 rounded-[4px]">
                      {item.number}
                    </span>
                    <span className="text-[10px] text-[#7D8DA0]">
                      Archived {new Date(item.archived_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-2">
                    {item.title}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.parties.map((party) => (
                      <span key={party} className="text-[10px] text-[#B6C3D1] bg-[#112F5A] px-2 py-0.5 rounded-[4px]">
                        {party}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7D8DA0]">
                    <span>Published {new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="text-[#6CA9FF]">View Report &rarr;</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded-[6px] transition-colors duration-200 ${
                    p === page
                      ? "bg-[#1E6FE8] text-white"
                      : "text-[#B6C3D1] hover:text-white bg-[#0B2345]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
