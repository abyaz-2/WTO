"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EvidenceFile {
  id: string;
  file: File;
  description: string;
  progress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}

interface EvidenceUploadProps {
  issueId: string;
  onUploadComplete?: (files: { file_path: string; file_type: string; file_size: number }[]) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];
const MAX_SIZE = 25 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(type: string): string {
  if (type.includes("pdf")) return "PDF";
  if (type.includes("wordprocessingml")) return "DOCX";
  if (type.includes("jpeg")) return "JPEG";
  if (type.includes("png")) return "PNG";
  return "FILE";
}

export default function EvidenceUpload({ issueId, onUploadComplete }: EvidenceUploadProps) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}. Allowed: PDF, DOCX, JPEG, PNG.`;
    }
    if (file.size > MAX_SIZE) {
      return `File too large: ${formatFileSize(file.size)}. Maximum is 25 MB.`;
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const entries: EvidenceFile[] = Array.from(newFiles)
      .filter((file) => {
        const error = validateFile(file);
        if (error) {
          return false;
        }
        return true;
      })
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        description: "",
        progress: 0,
        status: "pending" as const,
      }));

    if (entries.length > 0) {
      setFiles((prev) => [...prev, ...entries]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateDescription = useCallback((id: string, description: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, description } : f)),
    );
  }, []);

  const uploadFiles = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    const uploaded: { file_path: string; file_type: string; file_size: number }[] = [];

    for (const fileEntry of pending) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileEntry.id ? { ...f, status: "uploading", progress: 0 } : f)),
      );

      try {
        const formData = new FormData();
        formData.append("file", fileEntry.file);
        formData.append("description", fileEntry.description);
        formData.append("issue_id", issueId);

        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileEntry.id ? { ...f, progress } : f,
                ),
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Upload failed")));

          xhr.open("POST", `/api/v1/issues/${issueId}/evidence`);
          xhr.send(formData);
        });

        const response = JSON.parse(xhr.responseText);
        uploaded.push({
          file_path: response.storage_path,
          file_type: fileEntry.file.type,
          file_size: fileEntry.file.size,
        });

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id ? { ...f, status: "uploaded", progress: 100 } : f,
          ),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileEntry.id
              ? { ...f, status: "error", error: (err as Error).message }
              : f,
          ),
        );
      }
    }

    onUploadComplete?.(uploaded);
  }, [files, issueId, onUploadComplete]);

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[12px] p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-[#1E6FE8] bg-[rgba(30,111,232,0.08)]"
            : "border-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.3)] bg-[#0B2345]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />

        <svg
          className="w-10 h-10 mx-auto mb-3 text-[#7D8DA0]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-white font-medium mb-1">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-[#7D8DA0]">
          PDF, DOCX, JPEG, PNG — up to 25 MB each
        </p>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {files.map((fileEntry) => (
              <motion.div
                key={fileEntry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-4 p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#112F5A] flex items-center justify-center text-xs font-bold text-[#6CA9FF] flex-shrink-0">
                  {getFileTypeIcon(fileEntry.file.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{fileEntry.file.name}</p>
                    <span className="text-xs text-[#7D8DA0]">{formatFileSize(fileEntry.file.size)}</span>
                  </div>

                  <input
                    type="text"
                    placeholder="Add a description..."
                    value={fileEntry.description}
                    onChange={(e) => updateDescription(fileEntry.id, e.target.value)}
                    disabled={fileEntry.status !== "pending"}
                    className="w-full mt-2 px-3 py-1.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[6px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] disabled:opacity-50"
                  />

                  {fileEntry.status === "uploading" && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                        <motion.div
                          className="h-full bg-[#1E6FE8] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${fileEntry.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#7D8DA0] mt-1">{fileEntry.progress}%</span>
                    </div>
                  )}

                  {fileEntry.status === "error" && (
                    <p className="text-xs text-red-400 mt-1">{fileEntry.error ?? "Upload failed"}</p>
                  )}

                  {fileEntry.status === "uploaded" && (
                    <p className="text-xs text-green-400 mt-1">Uploaded successfully</p>
                  )}
                </div>

                {fileEntry.status === "pending" && (
                  <button
                    onClick={() => removeFile(fileEntry.id)}
                    className="p-1 text-[#7D8DA0] hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))}

            {files.some((f) => f.status === "pending") && (
              <button
                onClick={uploadFiles}
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] rounded-[8px] transition-colors"
              >
                Upload {files.filter((f) => f.status === "pending").length} file(s)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
