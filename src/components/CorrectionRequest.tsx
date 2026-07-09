"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CorrectionRequestProps {
  selectedText: string;
  sectionTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { proposedRevision: string; justification: string }) => void;
  submitting?: boolean;
}

export default function CorrectionRequest({
  selectedText,
  sectionTitle,
  isOpen,
  onClose,
  onSubmit,
  submitting = false,
}: CorrectionRequestProps): ReactNode {
  const [proposedRevision, setProposedRevision] = useState("");
  const [justification, setJustification] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!proposedRevision.trim()) {
      newErrors.proposedRevision = "Proposed revision is required";
    }
    if (justification.trim().length < 20) {
      newErrors.justification = "Justification must be at least 20 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ proposedRevision: proposedRevision.trim(), justification: justification.trim() });
    setProposedRevision("");
    setJustification("");
    setErrors({});
  }

  function handleClose() {
    setProposedRevision("");
    setJustification("");
    setErrors({});
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg mx-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Request Correction</h3>
                <p className="text-xs text-[#7D8DA0] mt-0.5">{sectionTitle}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-[#112F5A] text-[#7D8DA0] hover:text-white transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">Selected Text</label>
                <div className="px-4 py-3 text-sm text-[#B6C3D1] bg-[#05162D] border border-[rgba(255,255,255,0.08)] rounded-[8px] leading-relaxed max-h-24 overflow-y-auto">
                  {selectedText || <span className="italic text-[#7D8DA0]">No text selected</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="proposedRevision" className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">
                  Proposed Revision <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="proposedRevision"
                  value={proposedRevision}
                  onChange={(e) => setProposedRevision(e.target.value)}
                  placeholder="Enter your proposed revision..."
                  rows={4}
                  className="w-full px-4 py-3 text-sm text-white bg-[#05162D] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200 resize-none"
                />
                {errors.proposedRevision && (
                  <p className="text-xs text-red-400">{errors.proposedRevision}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="justification" className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">
                  Justification <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why this change is needed (min. 20 characters)..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm text-white bg-[#05162D] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors duration-200 resize-none"
                />
                <div className="flex items-center justify-between">
                  {errors.justification ? (
                    <p className="text-xs text-red-400">{errors.justification}</p>
                  ) : (
                    <span />
                  )}
                  <span className={`text-[11px] ${justification.length >= 20 ? "text-green-400" : "text-[#7D8DA0]"}`}>
                    {justification.length}/20 min
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-sm font-medium text-[#B6C3D1] hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
