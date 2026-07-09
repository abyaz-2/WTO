"use client";

import { motion } from "framer-motion";
import type { IssueStatus, UserRole } from "@/lib/types";

interface ActionPanelProps {
  issueStatus: IssueStatus;
  userRole: UserRole | null;
  onAction?: (action: string) => void;
}

interface Action {
  key: string;
  label: string;
  variant: "primary" | "secondary" | "danger";
  description?: string;
}

const stateActions: Record<string, Action[]> = {
  draft: [
    { key: "submit", label: "Submit for Review", variant: "primary", description: "Submit this issue for EB review" },
    { key: "edit", label: "Edit Issue", variant: "secondary" },
  ],
  submitted: [
    { key: "awaiting_review", label: "Awaiting Review", variant: "secondary", description: "Issue is pending EB review" },
  ],
  under_review: [
    { key: "approve", label: "Approve Issue", variant: "primary" },
    { key: "reject", label: "Reject Issue", variant: "danger" },
    { key: "send_to_draft", label: "Send Back to Draft", variant: "secondary" },
  ],
  rejected: [
    { key: "resubmit", label: "Resubmit Issue", variant: "primary" },
    { key: "delete", label: "Delete Issue", variant: "danger" },
  ],
  approved: [
    { key: "open_registration", label: "Open Registration", variant: "primary" },
  ],
  registration_open: [
    { key: "close_registration", label: "Close Registration", variant: "secondary" },
    { key: "begin_submissions", label: "Begin Submission Phase", variant: "primary" },
  ],
  registration_closed: [
    { key: "reopen_registration", label: "Reopen Registration", variant: "secondary" },
    { key: "begin_submissions", label: "Begin Submission Phase", variant: "primary" },
  ],
  submission_phase: [
    { key: "close_submissions", label: "Close Submissions", variant: "secondary" },
    { key: "begin_evidence", label: "Begin Evidence Phase", variant: "primary" },
  ],
  evidence_phase: [
    { key: "close_evidence", label: "Close Evidence", variant: "secondary" },
    { key: "start_ai_processing", label: "Start AI Processing", variant: "primary" },
  ],
  ai_processing: [
    { key: "processing", label: "AI Processing...", variant: "secondary" },
  ],
  eb_review: [
    { key: "approve_report", label: "Approve Report", variant: "primary" },
    { key: "request_fact_check", label: "Request Fact Check", variant: "secondary" },
    { key: "send_to_revision", label: "Request Revision", variant: "secondary" },
  ],
  fact_checking: [
    { key: "approve_fact_check", label: "Approve Fact Check", variant: "primary" },
    { key: "request_correction", label: "Request Correction", variant: "danger" },
  ],
  final_revision: [
    { key: "approve_final", label: "Approve Final Version", variant: "primary" },
    { key: "send_to_eb", label: "Send to EB Review", variant: "secondary" },
  ],
  final_published: [
    { key: "view_report", label: "View Final Report", variant: "primary" },
    { key: "archive", label: "Archive Issue", variant: "secondary" },
  ],
  archived: [
    { key: "reopen", label: "Reopen Issue", variant: "secondary" },
  ],
};

const ebonlyStates: IssueStatus[] = [
  "under_review",
  "rejected",
  "approved",
  "registration_open",
  "registration_closed",
  "eb_review",
  "fact_checking",
  "final_revision",
  "final_published",
  "archived",
];

export default function ActionPanel({ issueStatus, userRole, onAction }: ActionPanelProps) {
  const actions = stateActions[issueStatus] ?? [];

  const filteredActions = actions.filter((action) => {
    if (ebonlyStates.includes(issueStatus) && userRole !== "executive_board") {
      return false;
    }
    if (issueStatus === "draft" && userRole !== "delegate") {
      return false;
    }
    return true;
  });

  if (filteredActions.length === 0) {
    return null;
  }

  const buttonStyles = {
    primary: "bg-[#1E6FE8] text-white hover:bg-[#1A5FC8]",
    secondary: "bg-transparent text-[#B6C3D1] border border-[rgba(255,255,255,0.16)] hover:text-white hover:border-[rgba(255,255,255,0.3)]",
    danger: "bg-transparent text-red-400 border border-red-400/30 hover:bg-red-400/10 hover:border-red-400/50",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {filteredActions.map((action) => (
        <div key={action.key}>
          <button
            onClick={() => onAction?.(action.key)}
            className={`w-full px-4 py-2.5 text-sm font-medium rounded-[8px] transition-all duration-200 ${buttonStyles[action.variant]}`}
          >
            {action.label}
          </button>
          {action.description && (
            <p className="text-xs text-[#7D8DA0] mt-1 px-1">{action.description}</p>
          )}
        </div>
      ))}
    </motion.div>
  );
}
