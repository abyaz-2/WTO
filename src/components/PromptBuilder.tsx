"use client";

import { useState, useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";

interface ParticipantData {
  displayName: string;
  role: string;
}

interface SubmissionData {
  submissionType: string;
  content: Record<string, unknown>;
  status: string;
  participantDisplayName?: string;
  participantRole?: string;
}

interface EvidenceData {
  description?: string;
  fileType: string;
  fileSize: number;
  participantDisplayName?: string;
}

interface PromptData {
  issue: {
    issueNumber: string;
    title: string;
    description?: string;
    currentStatus: string;
    createdAt: string;
  };
  participants: ParticipantData[];
  submissions: SubmissionData[];
  evidence: EvidenceData[];
  generatedAt: string;
}

interface PromptBuilderProps {
  issueId: string;
}

export default function PromptBuilder({ issueId }: PromptBuilderProps): ReactNode {
  const [data, setData] = useState<PromptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [issueId]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/prompt`);
      if (!res.ok) throw new Error("Failed to load prompt data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  function buildPrompt(): string {
    if (!data) return "";
    const { issue, participants, submissions, evidence } = data;

    const sections: string[] = [];

    sections.push("=== WTO DISPUTE PANEL REPORT PROMPT ===");
    sections.push("");
    sections.push(`Dispute Number: ${issue.issueNumber}`);
    sections.push(`Title: ${issue.title}`);
    sections.push(`Filed: ${new Date(issue.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`);
    if (issue.description) {
      sections.push(`Description: ${issue.description}`);
    }
    sections.push("");

    sections.push("--- PARTICIPANTS ---");
    for (const p of participants) {
      sections.push(`  ${p.role.charAt(0).toUpperCase() + p.role.slice(1)}: ${p.displayName}`);
    }
    sections.push("");

    sections.push("--- SUBMISSIONS ---");
    if (submissions.length === 0) {
      sections.push("  No submissions filed.");
    } else {
      for (const sub of submissions) {
        sections.push(`[${sub.submissionType}] — ${sub.participantDisplayName ?? "Unknown"} (${sub.participantRole ?? "Unknown"})`);
        sections.push(`Status: ${sub.status}`);
        if (sub.content) {
          const text = typeof sub.content === "object" ? JSON.stringify(sub.content, null, 2) : String(sub.content);
          sections.push(text);
        }
        sections.push("");
      }
    }

    sections.push("--- EVIDENCE ---");
    if (evidence.length === 0) {
      sections.push("  No evidence submitted.");
    } else {
      for (const ev of evidence) {
        sections.push(`  - ${ev.description ?? "Untitled"} (${ev.fileType}, ${(ev.fileSize / 1024).toFixed(1)} KB) — ${ev.participantDisplayName ?? "Unknown"}`);
      }
    }
    sections.push("");

    sections.push("--- INSTRUCTIONS ---");
    sections.push("Please generate a formal WTO Panel Report based on the above submissions and evidence.");
    sections.push("Follow the standard WTO panel report structure:");
    sections.push("  1. Introduction — Panel establishment, composition, terms of reference");
    sections.push("  2. Factual Aspects — Description of the measure, products, parties' submissions");
    sections.push("  3. Parties' Requests — Complainant's and Respondent's requests");
    sections.push("  4. Legal Analysis — Article-by-article analysis of each claim");
    sections.push("  5. Findings — Panel's determination on each claim");
    sections.push("  6. Recommendations and Rulings — Implementation recommendations");
    sections.push("");
    sections.push("Use formal WTO legal language. Cite specific submissions and evidence where relevant.");
    sections.push("Base all findings and conclusions strictly on the information provided above.");

    return sections.join("\n");
  }

  async function copyToClipboard() {
    const prompt = buildPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = prompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
        <p className="text-sm text-[#7D8DA0]">No data available for this issue</p>
      </div>
    );
  }

  const prompt = buildPrompt();
  const wordCount = prompt.split(/\s+/).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#B6C3D1]">
            <span className="font-medium text-white">{wordCount.toLocaleString()}</span> words — ready to copy
          </p>
          <p className="text-xs text-[#7D8DA0] mt-0.5">
            Includes issue details, {data.submissions.length} submissions, {data.evidence.length} evidence items
          </p>
        </div>
        <motion.button
          onClick={copyToClipboard}
          whileTap={{ scale: 0.97 }}
          className={`px-5 py-2.5 text-sm font-semibold rounded-[8px] transition-colors duration-200 flex items-center gap-2 ${
            copied ? "bg-green-600 text-white" : "bg-[#1E6FE8] text-white hover:bg-[#1A5FC4]"
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Prompt
            </>
          )}
        </motion.button>
      </div>

      <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.08)] bg-[#112F5A]">
          <span className="text-xs font-medium text-[#B6C3D1] tracking-wider uppercase">Generated Prompt</span>
          <span className="text-[10px] text-[#7D8DA0]">Paste this into your AI tool</span>
        </div>
        <pre className="px-6 py-5 text-sm text-[#B6C3D1] font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[600px] overflow-y-auto">
          {prompt}
        </pre>
      </div>
    </div>
  );
}