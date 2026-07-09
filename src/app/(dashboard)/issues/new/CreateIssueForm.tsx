"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";

interface CreateIssueFormData {
  title: string;
  description: string;
  respondent_id?: string;
}

export default function CreateIssueForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIssueFormData>();

  const onSubmit = async (data: CreateIssueFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/v1/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text().catch(() => "Failed to create issue"));
      }

      const issue = await response.json();
      router.push(`/issues/${issue.id}`);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-white mb-1.5">
            Issue Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. US — Certain Measures on Steel Imports"
            {...register("title", {
              required: "Title is required",
              minLength: { value: 10, message: "Title must be at least 10 characters" },
              maxLength: { value: 200, message: "Title must not exceed 200 characters" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all"
          />
          {errors.title && (
            <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-white mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            rows={8}
            placeholder="Describe the trade dispute issue in detail..."
            {...register("description", {
              required: "Description is required",
              minLength: { value: 50, message: "Description must be at least 50 characters" },
              maxLength: { value: 5000, message: "Description must not exceed 5000 characters" },
            })}
            className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[8px] focus:outline-none focus:border-[rgba(30,111,232,0.5)] focus:ring-1 focus:ring-[rgba(30,111,232,0.3)] transition-all resize-y min-h-[160px]"
          />
          {errors.description && (
            <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
          )}
        </div>
      </div>

      {submitError && (
        <div className="p-3 rounded-[8px] bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">{submitError}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition-colors"
        >
          {isSubmitting ? "Creating..." : "Create Issue"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium text-[#B6C3D1] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </motion.form>
  );
}
