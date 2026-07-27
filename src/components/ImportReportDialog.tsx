"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

export default function ImportReportDialog({ isOpen, onClose, onSubmit }: ImportReportDialogProps): ReactNode {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-3xl rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Import AI Report</h2>
                <p className="text-xs text-[#7D8DA0] mt-0.5">
                  Paste the AI-generated report text below
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#7D8DA0] hover:text-white hover:bg-[#112F5A] transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste the AI-generated report here..."
                rows={16}
                className="w-full px-4 py-3 text-sm text-white bg-[#05162D] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200 resize-y font-mono leading-relaxed"
              />

              {error && (
                <p className="mt-3 text-xs text-red-400">{error}</p>
              )}

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white border border-[rgba(255,255,255,0.08)] rounded-[8px] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Report"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}