"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PromptBuilder from "@/components/PromptBuilder";

export default function PromptPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="mb-8">
          <Link
            href={`/dashboard/issues/${issueId}/reports`}
            className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
          >
            &larr; Back to Reports
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1">Build Report Prompt</h1>
          <p className="text-sm text-[#B6C3D1] mt-1">
            Compile all dispute data into a structured prompt for an external AI. Copy and paste into your AI tool to generate a panel report.
          </p>
        </div>

        <PromptBuilder issueId={issueId} />
      </div>
    </div>
  );
}