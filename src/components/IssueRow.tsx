"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Issue } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

interface IssueRowProps {
  issue: Issue;
}

function relativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function IssueRow({ issue }: IssueRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        href={`/issues/${issue.id}`}
        className="flex items-center gap-4 px-5 py-4 rounded-[8px] border border-transparent hover:border-[rgba(255,255,255,0.08)] hover:bg-[#112F5A] transition-all duration-200 group"
      >
        <StatusBadge status={issue.current_status} variant="md" />

        <span className="text-sm font-mono text-[#7D8DA0] min-w-[90px]">
          {issue.issue_number}
        </span>

        <span className="flex-1 text-sm text-white truncate min-w-0 group-hover:text-[#6CA9FF] transition-colors">
          {issue.title}
        </span>

        <span className="text-xs text-[#7D8DA0] min-w-[60px] text-right">
          {relativeTime(issue.updated_at)}
        </span>

        <svg
          className="w-4 h-4 text-[#7D8DA0] group-hover:text-white transition-colors flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  );
}
