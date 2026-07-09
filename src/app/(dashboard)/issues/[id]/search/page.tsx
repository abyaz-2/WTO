"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";

interface SearchResult {
  result_type: string;
  result_id: string;
  title: string;
  snippet: string;
  rank: number;
}

export default function SearchPage() {
  const params = useParams();
  const issueId = params.id as string;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const debounceTimer = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (value: string) => {
        clearTimeout(timer);
        timer = setTimeout(() => setDebouncedQuery(value), 300);
      };
    })(),
    [],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["search", issueId, debouncedQuery, typeFilter, page],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { results: [], total: 0 };
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_dispute_content", {
        dispute_id_param: issueId,
        search_query: debouncedQuery,
        filter_type: typeFilter,
        page_param: page,
        page_size: perPage,
      });
      if (error) throw error;
      return { results: (data as SearchResult[]) || [], total: (data as SearchResult[])?.length || 0 };
    },
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <h1 className="font-bold text-2xl text-white tracking-tight mb-2">Search</h1>
        <p className="text-[#B6C3D1] text-sm mb-6">Search submissions and evidence filed in this dispute.</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); debounceTimer(e.target.value); setPage(1); }}
              placeholder="Search submissions and evidence..."
              className="w-full px-4 py-3 pl-10 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D8DA0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] focus:outline-none focus:border-[#1E6FE8] transition-colors"
          >
            <option value="all">All Types</option>
            <option value="submissions">Submissions</option>
            <option value="evidence">Evidence</option>
          </select>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton variant="row" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
          </div>
        )}

        {error && (
          <EmptyState icon="alert" title="Search failed" description="An error occurred while searching. Please try again." />
        )}

        {debouncedQuery && debouncedQuery.length >= 2 && data && data.results.length === 0 && !isLoading && (
          <EmptyState
            icon="search"
            title={`No results for "${debouncedQuery}"`}
            description="Try broadening your search terms or adjusting filters."
          />
        )}

        {data && data.results.length > 0 && (
          <>
            <p className="text-xs text-[#7D8DA0] mb-4">
              {data.total} result{data.total !== 1 ? "s" : ""} for &ldquo;{debouncedQuery}&rdquo;
            </p>
            <div className="space-y-3">
              {data.results.map((result, i) => (
                <motion.div
                  key={`${result.result_type}-${result.result_id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="p-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] hover:bg-[#112F5A] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#6CA9FF] uppercase">
                      {result.result_type}
                    </span>
                    <span className="text-xs text-[#7D8DA0]">
                      Rank: {result.rank.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-white font-medium mb-1">{result.title}</p>
                  <p className="text-xs text-[#B6C3D1] leading-relaxed" dangerouslySetInnerHTML={{ __html: result.snippet }} />
                </motion.div>
              ))}
            </div>
            <div className="mt-6">
              <Pagination currentPage={page} totalPages={Math.ceil(data.total / perPage)} onPageChange={setPage} />
            </div>
          </>
        )}

        {!debouncedQuery && (
          <EmptyState
            icon="search"
            title="Search dispute content"
            description="Type at least 2 characters to search submissions and evidence."
          />
        )}
      </div>
    </div>
  );
}
