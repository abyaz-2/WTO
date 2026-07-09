"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchIssues } from "@/lib/api";
import IssueRow from "@/components/IssueRow";
import Pagination from "@/components/Pagination";
import { IssueListSkeleton } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type SortOption = "newest" | "oldest" | "title_asc" | "title_desc";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
];

const statusFilters = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "registration_open", label: "Registration Open" },
  { value: "submission_phase", label: "Submission Phase" },
  { value: "evidence_phase", label: "Evidence Phase" },
  { value: "final_published", label: "Published" },
];

export default function IssueList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["issues", debouncedSearch, statusFilter, sort, page],
    queryFn: () =>
      fetchIssues({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        sort,
        page,
        page_size: 15,
      }),
  });

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    [],
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value);
      setPage(1);
    },
    [],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSort(e.target.value as SortOption);
      setPage(1);
    },
    [],
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7D8DA0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search issues..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0B2345] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="px-4 py-2.5 text-sm bg-[#0B2345] border border-[rgba(255,255,255,0.08)] text-[#B6C3D1] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] appearance-none cursor-pointer min-w-[160px]"
        >
          {statusFilters.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={handleSortChange}
          className="px-4 py-2.5 text-sm bg-[#0B2345] border border-[rgba(255,255,255,0.08)] text-[#B6C3D1] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] appearance-none cursor-pointer min-w-[150px]"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-[rgba(255,255,255,0.08)] rounded-[12px] overflow-hidden">
        {isLoading ? (
          <div className="p-5">
            <IssueListSkeleton />
          </div>
        ) : isError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-400">
              {(error as Error)?.message ?? "Failed to load issues."}
            </p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No issues found"
            description={
              debouncedSearch || statusFilter
                ? "Try adjusting your search or filters."
                : "There are no issues yet. Create your first issue to get started."
            }
            action={
              !debouncedSearch && !statusFilter
                ? { label: "Create Issue", onClick: () => router.push("/issues/new") }
                : undefined
            }
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="divide-y divide-[rgba(255,255,255,0.06)]"
          >
            {data.data.map((issue) => (
              <IssueRow key={issue.id} issue={issue} />
            ))}
          </motion.div>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
