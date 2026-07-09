"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { ReportVersion, ReportSection } from "@/lib/types";
import ConfidenceBadge from "@/components/ConfidenceBadge";

interface EditableSection {
  id: string;
  title: string;
  content: string;
  originalContent: string;
  confidence: number;
  hasChanges: boolean;
  saving: boolean;
  reverted: boolean;
}

interface Comment {
  id: string;
  sectionId: string;
  paragraphIndex: number;
  text: string;
  author: string;
  createdAt: string;
}

export default function ReportEditPage(): ReactNode {
  const params = useParams();
  const issueId = params.id as string;
  const reportId = params.reportId as string;

  const [sections, setSections] = useState<EditableSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showCommentPanel, setShowCommentPanel] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<string>("");
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    fetchReport();
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [issueId, reportId]);

  useEffect(() => {
    if (sections.length > 0 && autoSaveTimer.current === null) {
      autoSaveTimer.current = setInterval(autoSave, 15000);
    }
    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
  }, [sections]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}?edit=true`);
      if (!res.ok) throw new Error("Failed to load report for editing");
      const data = await res.json();
      const report: ReportVersion = data.report;
      setVersionNumber(report.version);

      if (report.sections && report.sections.length > 0) {
        setSections(
          report.sections.map((s: ReportSection) => ({
            id: s.id,
            title: s.title,
            content: s.content,
            originalContent: s.content,
            confidence: s.confidence,
            hasChanges: false,
            saving: false,
            reverted: false,
          }))
        );
      }
      setComments(data.comments ?? []);
      setGlobalStatus(report.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  const autoSave = useCallback(async () => {
    const dirty = sections.filter((s) => s.hasChanges && !s.saving);
    if (dirty.length === 0) return;

    for (const section of dirty) {
      await saveSection(section.id, false);
    }
  }, [sections]);

  async function saveSection(sectionId: string, showNotification = true) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, saving: true } : s))
    );

    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    try {
      const res = await fetch(
        `/api/v1/issues/${issueId}/ai-reports/${reportId}/sections/${sectionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: section.content }),
        }
      );
      if (!res.ok) throw new Error("Failed to save section");
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, hasChanges: false, saving: false, originalContent: s.content }
            : s
        )
      );
    } catch {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, saving: false } : s))
      );
    }
  }

  function handleContentChange(sectionId: string, content: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, content, hasChanges: content !== s.originalContent, reverted: false }
          : s
      )
    );
  }

  function revertSection(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, content: s.originalContent, hasChanges: false, reverted: true }
          : s
      )
    );
    setTimeout(() => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, reverted: false } : s))
      );
    }, 2000);
  }

  function handleTextSelect(sectionId: string) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedSection(null);
      setSelectedParagraph(null);
      setShowCommentPanel(false);
      return;
    }

    const editorEl = editorRefs.current.get(sectionId);
    if (!editorEl) return;

    let paraIndex = -1;
    const paragraphs = editorEl.querySelectorAll("[data-paragraph-index]");
    paragraphs.forEach((p, idx) => {
      if (selection.containsNode(p, true)) paraIndex = idx;
    });

    if (paraIndex >= 0) {
      setSelectedSection(sectionId);
      setSelectedParagraph(paraIndex);
      setShowCommentPanel(true);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !selectedSection || selectedParagraph === null) return;

    try {
      const res = await fetch(`/api/v1/issues/${issueId}/ai-reports/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: selectedSection,
          paragraphIndex: selectedParagraph,
          text: newComment.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to add comment");
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button
              onClick={fetchReport}
              className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">No sections available for editing</p>
          </div>
        </div>
      </div>
    );
  }

  const sectionComments = comments.filter(
    (c) => c.sectionId === selectedSection && c.paragraphIndex === selectedParagraph
  );

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href={`/dashboard/issues/${issueId}/reports/${reportId}`}
              className="text-xs text-[#6CA9FF] hover:text-white transition-colors duration-200 inline-block mb-1"
            >
              &larr; Back to Report View
            </Link>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1">
              Edit Report v{versionNumber}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#7D8DA0]">
              Saving every 15s
            </span>
            <span className="text-xs text-[#B6C3D1] bg-[#112F5A] px-2 py-1 rounded-[4px]">
              {globalStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {sections.map((section) => (
              <motion.div
                key={section.id}
                layout
                className={`rounded-[12px] border overflow-hidden transition-colors duration-200 ${
                  section.reverted
                    ? "border-amber-500/40 bg-amber-500/5"
                    : section.hasChanges
                    ? "border-[#1E6FE8]/40 bg-[#1E6FE8]/5"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
                }`}
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                    <ConfidenceBadge score={section.confidence} className="scale-[0.85]" />
                    {section.hasChanges && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-[4px]">
                        Unsaved
                      </span>
                    )}
                    {section.saving && (
                      <div className="w-3.5 h-3.5 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => revertSection(section.id)}
                      className="px-3 py-1.5 text-xs font-medium text-[#B6C3D1] hover:text-amber-400 border border-[rgba(255,255,255,0.08)] hover:border-amber-500/30 rounded-[6px] transition-colors duration-200"
                    >
                      Revert Section
                    </button>
                    <button
                      onClick={() => saveSection(section.id)}
                      disabled={!section.hasChanges || section.saving}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[6px] hover:bg-[#1A5FC4] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div
                  ref={(el) => {
                    if (el) editorRefs.current.set(section.id, el);
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleContentChange(section.id, e.currentTarget.textContent ?? "")}
                  onMouseUp={() => handleTextSelect(section.id)}
                  className="px-5 py-4 text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap focus:outline-none min-h-[100px] cursor-text"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {section.content.split("\n\n").map((para, pIdx) => (
                    <p key={pIdx} data-paragraph-index={pIdx} className="mb-3 last:mb-0">
                      {para || "\u00A0"}
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <AnimatePresence>
              {showCommentPanel && selectedSection && selectedParagraph !== null ? (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden sticky top-8"
                >
                  <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.08)]">
                    <h3 className="text-sm font-semibold text-white">Comments</h3>
                    <p className="text-[11px] text-[#7D8DA0] mt-0.5">
                      Paragraph {selectedParagraph + 1}
                    </p>
                  </div>

                  <div className="px-5 py-4 max-h-[300px] overflow-y-auto space-y-3">
                    {sectionComments.length === 0 ? (
                      <p className="text-xs text-[#7D8DA0]">No comments yet</p>
                    ) : (
                      sectionComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-[#112F5A] rounded-[8px] p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-white">
                              {comment.author}
                            </span>
                            <span className="text-[10px] text-[#7D8DA0]">
                              {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-[#B6C3D1] leading-relaxed">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.08)]">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.08)] rounded-[6px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200 resize-none"
                    />
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="mt-2 w-full py-2 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[6px] hover:bg-[#1A5FC4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      Add Comment
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6">
                  <p className="text-xs text-[#7D8DA0]">
                    Select text in any section to add a comment.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
