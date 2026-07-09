"use client";

import type { ReactNode } from "react";
import type { ReportSection as ReportSectionType } from "@/lib/types";
import { motion } from "framer-motion";
import ConfidenceBadge from "./ConfidenceBadge";

interface ReportSectionProps {
  section: ReportSectionType;
  editable?: boolean;
  onEdit?: (sectionId: string) => void;
  onComment?: (sectionId: string, paragraphIndex: number) => void;
}

export default function ReportSectionComponent({
  section,
  editable = false,
  onEdit,
  onComment,
}: ReportSectionProps): ReactNode {
  const paragraphs = section.content.split("\n\n").filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white tracking-tight">{section.title}</h3>
          <ConfidenceBadge score={section.confidence} />
        </div>
        <div className="flex items-center gap-2">
          {editable && onEdit && (
            <button
              onClick={() => onEdit(section.id)}
              className="px-3 py-1.5 text-xs font-medium text-[#6CA9FF] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[#6CA9FF] rounded-[6px] transition-colors duration-200"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {paragraphs.map((paragraph, idx) => (
          <div key={idx} className="group relative">
            <p className="text-sm text-[#B6C3D1] leading-relaxed mb-3 last:mb-0 whitespace-pre-wrap">
              {paragraph}
            </p>
            {onComment && (
              <button
                onClick={() => onComment(section.id, idx)}
                className="absolute -left-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-5 h-5 flex items-center justify-center rounded-full bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-[#7D8DA0] hover:text-[#6CA9FF] text-xs"
                title="Add comment"
              >
                +
              </button>
            )}
          </div>
        ))}

        {section.citations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
            <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-2">Citations</p>
            <div className="flex flex-wrap gap-2">
              {section.citations.map((citation) => (
                <a
                  key={citation.id}
                  href={citation.url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#6CA9FF] bg-[#112F5A] rounded-[4px] hover:bg-[#1E6FE8] hover:text-white transition-colors duration-200"
                >
                  <span className="truncate max-w-[200px]">{citation.source}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
