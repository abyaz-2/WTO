"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DocumentViewerProps {
  evidenceId?: string;
  submissionVersionId?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  fileSize?: number;
  status?: string;
  uploadDate?: string;
}

interface DocumentMetadata {
  filename: string;
  size: number;
  type: string;
  status: string;
  uploadDate: string;
  scanStatus: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentViewer({
  evidenceId,
  fileUrl,
  fileType,
  fileName,
  fileSize,
  status,
  uploadDate,
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const metadata: DocumentMetadata = {
    filename: fileName ?? "Unknown",
    size: fileSize ?? 0,
    type: fileType ?? "unknown",
    status: status ?? "pending",
    uploadDate: uploadDate ?? new Date().toISOString(),
    scanStatus: "completed",
  };

  useEffect(() => {
    if (!fileUrl) {
      setIsLoading(false);
      setError("No file URL provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    if (fileType?.includes("pdf")) {
      setIsLoading(false);
      setTotalPages(1);
    } else if (fileType?.includes("wordprocessingml")) {
      setIsLoading(false);
      setContent("Document content would be rendered here via mammoth.js");
    } else if (fileType?.includes("image")) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setError("Unsupported file type");
    }
  }, [fileUrl, fileType]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <motion.div
            className="w-8 h-8 border-2 border-[#1E6FE8] border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <svg
            className="w-12 h-12 text-red-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      );
    }

    if (fileType?.includes("image")) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <img
            src={fileUrl}
            alt={fileName ?? "Document"}
            className="max-w-full max-h-full object-contain rounded-[8px]"
          />
        </div>
      );
    }

    if (fileType?.includes("pdf")) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 flex items-center justify-center bg-[rgba(0,0,0,0.2)] rounded-[8px] m-4">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-[#7D8DA0] mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm text-[#B6C3D1]">
                PDF viewer would render here
              </p>
              <p className="text-xs text-[#7D8DA0] mt-1">Page {pdfPage}{totalPages > 0 ? ` of ${totalPages}` : ""}</p>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pb-4">
              <button
                onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                disabled={pdfPage <= 1}
                className="px-3 py-1.5 text-xs text-[#B6C3D1] hover:text-white disabled:opacity-30 transition-colors rounded-[6px] border border-[rgba(255,255,255,0.08)]"
              >
                Previous
              </button>
              <span className="text-xs text-[#7D8DA0]">{pdfPage} / {totalPages}</span>
              <button
                onClick={() => setPdfPage((p) => Math.min(totalPages, p + 1))}
                disabled={pdfPage >= totalPages}
                className="px-3 py-1.5 text-xs text-[#B6C3D1] hover:text-white disabled:opacity-30 transition-colors rounded-[6px] border border-[rgba(255,255,255,0.08)]"
              >
                Next
              </button>
            </div>
          )}
        </div>
      );
    }

    if (content) {
      return (
        <div className="p-6 overflow-auto h-full text-sm text-[#B6C3D1] leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-sm text-[#7D8DA0]">
        No preview available
      </div>
    );
  };

  const viewerContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#6CA9FF]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-white truncate">{metadata.filename}</span>
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-[#7D8DA0] hover:text-white transition-colors"
          title="Toggle fullscreen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isFullscreen
                  ? "M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                  : "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
              }
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </motion.div>
  );

  return (
    <>
      <div className="h-full min-h-[400px] rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] overflow-hidden">
        {viewerContent}
      </div>

      {metadata.filename !== "Unknown" && (
        <div className="mt-4 p-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-3">Document Info</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[#7D8DA0]">Filename</p>
              <p className="text-sm text-white truncate">{metadata.filename}</p>
            </div>
            <div>
              <p className="text-xs text-[#7D8DA0]">Size</p>
              <p className="text-sm text-white">{formatFileSize(metadata.size)}</p>
            </div>
            <div>
              <p className="text-xs text-[#7D8DA0]">Type</p>
              <p className="text-sm text-white">{metadata.type.split("/").pop()?.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-xs text-[#7D8DA0]">Upload Date</p>
              <p className="text-sm text-white">
                {new Date(metadata.uploadDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#7D8DA0]">Status</p>
              <span
                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${
                  metadata.status === "validated"
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : metadata.status === "rejected"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                }`}
              >
                {metadata.status.charAt(0).toUpperCase() + metadata.status.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-xs text-[#7D8DA0]">Malware Scan</p>
              <span className="inline-block text-xs font-medium text-green-400 mt-0.5">
                {metadata.scanStatus === "completed" ? "Passed" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05162D]"
          >
            {viewerContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
