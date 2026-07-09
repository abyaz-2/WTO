"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssue, fetchParticipants } from "@/lib/api";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import IssueTimeline from "@/components/IssueTimeline";
import ParticipantList from "@/components/ParticipantList";
import ActionPanel from "@/components/ActionPanel";
import Skeleton from "@/components/Skeleton";
import { motion } from "framer-motion";

interface IssueDetailClientProps {
  issueId: string;
}

export default function IssueDetailClient({ issueId }: IssueDetailClientProps) {
  const router = useRouter();

  const { data: issue, isLoading: issueLoading, isError: issueError } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => fetchIssue(issueId),
  });

  const { data: participants } = useQuery({
    queryKey: ["participants", issueId],
    queryFn: () => fetchParticipants(issueId),
    enabled: !!issue,
  });

  if (issueLoading) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="max-w-[var(--content-width,1200px)] mx-auto space-y-6">
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-2/3" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  if (issueError || !issue) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="max-w-[var(--content-width,1200px)] mx-auto text-center py-16">
          <p className="text-red-400">Failed to load issue.</p>
          <button
            onClick={() => router.push("/issues")}
            className="mt-4 text-sm text-[#6CA9FF] hover:underline"
          >
            Back to issues
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.push("/issues")}
          className="flex items-center gap-1.5 text-sm text-[#7D8DA0] hover:text-white transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to issues
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <StatusBadge status={issue.current_status} variant="lg" />
                <span className="text-sm font-mono text-[#7D8DA0]">
                  {issue.issue_number}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-3">
                {issue.title}
              </h1>
              {issue.description && (
                <p className="text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
              <div className="p-5 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
                <IssueTimeline events={issue.timeline} />
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-5 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
            >
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-4">
                Issue Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[#7D8DA0]">Status</p>
                  <StatusBadge status={issue.current_status} variant="md" />
                </div>
                <div>
                  <p className="text-xs text-[#7D8DA0]">Filed</p>
                  <p className="text-sm text-white">
                    {new Date(issue.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-5 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
            >
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-4">
                Participants
              </h3>
              <ParticipantList
                participants={participants}
                issueStatus={issue.current_status}
                issueId={issue.id}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
            >
              <h3 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-4">
                Actions
              </h3>
              <ActionPanel
                issueStatus={issue.current_status}
                userRole={null}
                onAction={(action) => console.log("Action:", action)}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
