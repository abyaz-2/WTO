"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIssue, fetchSubmissions } from "@/lib/api";
import { useRouter } from "next/navigation";
import SubmissionCard from "@/components/SubmissionCard";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { motion } from "framer-motion";
import type { Submission, Participant } from "@/lib/types";
import { useState } from "react";

interface SubmissionsClientProps {
  issueId: string;
}

type PartyTab = "all" | "complainant" | "respondent" | "third_party";

export default function SubmissionsClient({ issueId }: SubmissionsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PartyTab>("all");

  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => fetchIssue(issueId),
  });

  const { data: submissions, isLoading: subsLoading } = useQuery({
    queryKey: ["submissions", issueId],
    queryFn: () => fetchSubmissions(issueId),
    enabled: !!issue,
  });

  const isLoading = issueLoading || subsLoading;
  const isSubmissionPhase = issue?.current_status === "submission_phase";

  const groupedByRole = (submissions ?? []).reduce<Record<string, Submission[]>>(
    (acc, sub) => {
      const role = sub.participant?.role ?? "other";
      if (!acc[role]) acc[role] = [];
      acc[role].push(sub);
      return acc;
    },
    {},
  );

  const filtered = activeTab === "all"
    ? submissions
    : groupedByRole[activeTab] ?? [];

  const tabs: { key: PartyTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "complainant", label: "Complainant" },
    { key: "respondent", label: "Respondent" },
    { key: "third_party", label: "Third Parties" },
  ];

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="max-w-[var(--content-width,1200px)] mx-auto space-y-4">
          <Skeleton variant="text" className="w-48" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Submissions</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">{issue?.title}</p>
          </div>
          {isSubmissionPhase && (
            <button
              onClick={() => router.push(`/issues/${issueId}/submissions/new`)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] rounded-[8px] transition-colors"
            >
              New Submission
            </button>
          )}
        </motion.div>

        <div className="flex gap-1 mb-6 p-1 bg-[#0B2345] rounded-[10px] border border-[rgba(255,255,255,0.08)] w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-[8px] transition-colors ${
                activeTab === tab.key
                  ? "bg-[#112F5A] text-white"
                  : "text-[#B6C3D1] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!filtered || filtered.length === 0 ? (
          <EmptyState
            title="No submissions yet"
            description={
              isSubmissionPhase
                ? "Submissions are open. Click 'New Submission' to submit."
                : "No submissions have been made yet."
            }
            action={
              isSubmissionPhase
                ? { label: "New Submission", onClick: () => router.push(`/issues/${issueId}/submissions/new`) }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {activeTab === "all"
              ? Object.entries(groupedByRole).map(([role, subs]) => (
                  <div key={role}>
                    <h3 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-3 capitalize">
                      {role.replace(/_/g, " ")}
                    </h3>
                    <div className="space-y-3">
                      {subs.map((sub) => (
                        <SubmissionCard
                          key={sub.id}
                          submission={sub}
                          onEdit={(id) => console.log("Edit", id)}
                          onSubmit={(id) => console.log("Submit", id)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              : filtered.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submission={sub}
                    onEdit={(id) => console.log("Edit", id)}
                    onSubmit={(id) => console.log("Submit", id)}
                  />
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
