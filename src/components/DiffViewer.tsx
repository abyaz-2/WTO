"use client";

import { useState, useMemo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DiffSegment {
  type: "same" | "removed" | "added" | "changed";
  text: string;
}

interface DiffChange {
  type: "removed" | "added" | "changed";
  originalText: string;
  revisedText: string;
  index: number;
}

interface DiffViewerProps {
  original: string;
  revised: string;
  title?: string;
}

function computeInlineDiff(original: string, revised: string): DiffSegment[] {
  const origWords = original.split(/(\s+)/);
  const revWords = revised.split(/(\s+)/);
  const segments: DiffSegment[] = [];

  let i = 0;
  let j = 0;

  while (i < origWords.length || j < revWords.length) {
    if (i < origWords.length && j < revWords.length && origWords[i] === revWords[j]) {
      segments.push({ type: "same", text: origWords[i] });
      i++;
      j++;
    } else {
      const origRemaining = origWords.slice(i).join("");
      const revRemaining = revWords.slice(j).join("");

      if (origRemaining === revRemaining) {
        if (i < origWords.length) segments.push({ type: "same", text: origWords[i] });
        i++;
        j++;
      } else if (j < revWords.length && (i >= origWords.length || origWords[i] !== revWords[j])) {
        segments.push({ type: "added", text: revWords[j] });
        j++;
      } else if (i < origWords.length) {
        segments.push({ type: "removed", text: origWords[i] });
        i++;
      }
    }
  }

  return segments;
}

function extractChanges(segments: DiffSegment[]): DiffChange[] {
  const changes: DiffChange[] = [];
  let changeIndex = 0;
  let i = 0;

  while (i < segments.length) {
    if (segments[i].type === "removed") {
      const origParts: string[] = [];
      const revParts: string[] = [];
      while (i < segments.length && (segments[i].type === "removed" || segments[i].type === "added")) {
        if (segments[i].type === "removed") origParts.push(segments[i].text);
        if (segments[i].type === "added") revParts.push(segments[i].text);
        i++;
      }
      changes.push({
        type: revParts.length > 0 ? "changed" as const : "removed" as const,
        originalText: origParts.join(""),
        revisedText: revParts.join(""),
        index: changeIndex++,
      });
    } else if (segments[i].type === "added") {
      const revParts: string[] = [];
      while (i < segments.length && segments[i].type === "added") {
        revParts.push(segments[i].text);
        i++;
      }
      changes.push({
        type: "added",
        originalText: "",
        revisedText: revParts.join(""),
        index: changeIndex++,
      });
    } else {
      i++;
    }
  }

  return changes;
}

export default function DiffViewer({ original, revised, title }: DiffViewerProps): ReactNode {
  const [mode, setMode] = useState<"inline" | "side-by-side">("inline");
  const [currentChange, setCurrentChange] = useState(0);

  const segments = useMemo(() => computeInlineDiff(original, revised), [original, revised]);
  const changes = useMemo(() => extractChanges(segments), [segments]);

  const addedLines = segments.filter((s) => s.type === "added").reduce((acc, s) => acc + s.text.split("\n").length - 1, 0);
  const removedLines = segments.filter((s) => s.type === "removed").reduce((acc, s) => acc + s.text.split("\n").length - 1, 0);

  const inlineView = (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case "removed":
            return (
              <span key={idx} className="bg-red-500/20 text-red-300 line-through rounded-[2px]">
                {seg.text}
              </span>
            );
          case "added":
            return (
              <span key={idx} className="bg-green-500/20 text-green-300 rounded-[2px]">
                {seg.text}
              </span>
            );
          case "changed":
            return (
              <span key={idx} className="bg-amber-500/20 text-amber-300 rounded-[2px]">
                {seg.text}
              </span>
            );
          default:
            return <span key={idx} className="text-[#B6C3D1]">{seg.text}</span>;
        }
      })}
    </div>
  );

  const sideBySideView = (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs font-medium text-red-400 mb-2 uppercase tracking-wider">Original</p>
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#B6C3D1] bg-[#05162D] rounded-[8px] p-4 border border-red-500/20">
          {segments.map((seg, idx) =>
            seg.type === "added" ? null : (
              <span
                key={idx}
                className={seg.type === "removed" ? "bg-red-500/20 text-red-300 line-through rounded-[2px]" : "text-[#B6C3D1]"}
              >
                {seg.text}
              </span>
            )
          )}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-green-400 mb-2 uppercase tracking-wider">Revised</p>
        <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-[#B6C3D1] bg-[#05162D] rounded-[8px] p-4 border border-green-500/20">
          {segments.map((seg, idx) =>
            seg.type === "removed" ? null : (
              <span
                key={idx}
                className={seg.type === "added" ? "bg-green-500/20 text-green-300 rounded-[2px]" : "text-[#B6C3D1]"}
              >
                {seg.text}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          <div className="flex items-center gap-2 text-xs text-[#7D8DA0]">
            <span className="text-green-400">+{addedLines}</span>
            <span className="text-red-400">-{removedLines}</span>
            <span className="text-[#B6C3D1]">across {changes.length} section{changes.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#112F5A] rounded-[6px] p-0.5">
            <button
              onClick={() => setMode("inline")}
              className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors duration-200 ${
                mode === "inline" ? "bg-[#1E6FE8] text-white" : "text-[#7D8DA0] hover:text-white"
              }`}
            >
              Inline
            </button>
            <button
              onClick={() => setMode("side-by-side")}
              className={`px-3 py-1 text-xs font-medium rounded-[4px] transition-colors duration-200 ${
                mode === "side-by-side" ? "bg-[#1E6FE8] text-white" : "text-[#7D8DA0] hover:text-white"
              }`}
            >
              Side by Side
            </button>
          </div>
          {changes.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentChange((p) => Math.max(0, p - 1))}
                disabled={currentChange === 0}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#112F5A] text-[#7D8DA0] hover:text-white disabled:opacity-40 transition-colors duration-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-[#7D8DA0] min-w-[3ch] text-center">
                {currentChange + 1}/{changes.length}
              </span>
              <button
                onClick={() => setCurrentChange((p) => Math.min(changes.length - 1, p + 1))}
                disabled={currentChange === changes.length - 1}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#112F5A] text-[#7D8DA0] hover:text-white disabled:opacity-40 transition-colors duration-200"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {mode === "inline" ? inlineView : sideBySideView}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
