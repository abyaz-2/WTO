"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";

interface User {
  id: string;
  display_name: string;
  email: string;
  country: string | null;
  role: string;
}

interface CreateIssueFormData {
  title: string;
  description: string;
  respondentId?: string;
  coComplainantIds?: string[];
}

function UserSearchSelect({
  users,
  selectedId,
  onChange,
  placeholder,
  excludeIds,
}: {
  users: User[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  placeholder: string;
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = users.filter((u) => {
    if (excludeIds?.includes(u.id)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.country ?? "").toLowerCase().includes(q)
    );
  });

  const selected = users.find((u) => u.id === selectedId);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white rounded-[8px] cursor-pointer flex items-center justify-between transition-all hover:border-[rgba(30,111,232,0.3)]"
      >
        <span className={selected ? "" : "text-[#7D8DA0]"}>
          {selected ? `${selected.display_name}${selected.country ? ` (${selected.country})` : ""}` : placeholder}
        </span>
        <svg className={`w-4 h-4 text-[#7D8DA0] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#112F5A] border border-[rgba(255,255,255,0.12)] rounded-[8px] shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-[rgba(255,255,255,0.06)]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search delegates..."
              className="w-full px-3 py-1.5 text-sm bg-[#0B2345] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[6px] focus:outline-none focus:border-[rgba(30,111,232,0.4)]"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#7D8DA0]">No users found</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setQuery(""); }}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors ${
                    selectedId === u.id ? "text-white bg-[rgba(30,111,232,0.15)]" : "text-[#B6C3D1]"
                  }`}
                >
                  <span className="text-white">{u.display_name}</span>
                  {u.country && <span className="text-[#7D8DA0] ml-1.5">({u.country})</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CoComplainantSelect({
  users,
  selectedIds,
  onChange,
  excludeIds,
}: {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = users.filter((u) => {
    if (excludeIds?.includes(u.id)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.display_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.country ?? "").toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedUsers = users.filter((u) => selectedIds.includes(u.id));

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-white rounded-[8px] cursor-pointer flex items-center justify-between transition-all hover:border-[rgba(30,111,232,0.3)]"
      >
        <span className={selectedIds.length > 0 ? "" : "text-[#7D8DA0]"}>
          {selectedIds.length > 0 ? `${selectedIds.length} co-complainant${selectedIds.length > 1 ? "s" : ""} selected` : "Select co-complainants"}
        </span>
        <svg className={`w-4 h-4 text-[#7D8DA0] transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedUsers.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[rgba(30,111,232,0.15)] text-[#6CA9FF] rounded-[4px]">
              {u.display_name}
              <button type="button" onClick={() => toggle(u.id)} className="hover:text-white transition-colors">&times;</button>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-[#112F5A] border border-[rgba(255,255,255,0.12)] rounded-[8px] shadow-xl max-h-64 overflow-hidden">
          <div className="p-2 border-b border-[rgba(255,255,255,0.06)]">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search delegates..."
              className="w-full px-3 py-1.5 text-sm bg-[#0B2345] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#7D8DA0] rounded-[6px] focus:outline-none focus:border-[rgba(30,111,232,0.4)]"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[#7D8DA0]">No users found</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[rgba(255,255,255,0.06)] transition-colors flex items-center gap-2 ${
                    selectedIds.includes(u.id) ? "text-white bg-[rgba(30,111,232,0.15)]" : "text-[#B6C3D1]"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.includes(u.id) ? "bg-[#1E6FE8] border-[#1E6FE8]" : "border-[rgba(255,255,255,0.2)]"
                  }`}>
                    {selectedIds.includes(u.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-white">{u.display_name}</span>
                  {u.country && <span className="text-[#7D8DA0] ml-0.5">({u.country})</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateIssueForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedRespondent, setSelectedRespondent] = useState<string | null>(null);
  const [selectedCoComplainants, setSelectedCoComplainants] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateIssueFormData>();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
          const sessionRes = await fetch("/api/v1/auth/session");
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            setCurrentUserId(session.user?.id ?? null);
          }
        }
      } catch {
        // silently fail
      } finally {
        setUsersLoading(false);
      }
    }
    load();
  }, []);

  const delegateUsers = users.filter((u) => u.role === "delegate");
  const respondentUsers = delegateUsers.filter((u) => u.id !== currentUserId && !selectedCoComplainants.includes(u.id));
  const coComplainantUsers = delegateUsers.filter((u) => u.id !== currentUserId && u.id !== selectedRespondent);

  const onSubmit = useCallback(async (data: CreateIssueFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/v1/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          respondentId: selectedRespondent || undefined,
          coComplainantIds: selectedCoComplainants.length > 0 ? selectedCoComplainants : undefined,
        }),
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
  }, [selectedRespondent, selectedCoComplainants, router]);

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

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Respondent <span className="text-[#7D8DA0] font-normal">(against whom)</span>
          </label>
          {usersLoading ? (
            <div className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-[#7D8DA0] rounded-[8px]">
              Loading delegates...
            </div>
          ) : (
            <UserSearchSelect
              users={respondentUsers}
              selectedId={selectedRespondent}
              onChange={setSelectedRespondent}
              placeholder="Select the respondent country/delegate..."
              excludeIds={[]}
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Co-Complainants <span className="text-[#7D8DA0] font-normal">(issue phrased by multiple delegates)</span>
          </label>
          {usersLoading ? (
            <div className="w-full px-4 py-2.5 text-sm bg-[#112F5A] border border-[rgba(255,255,255,0.08)] text-[#7D8DA0] rounded-[8px]">
              Loading delegates...
            </div>
          ) : (
            <CoComplainantSelect
              users={coComplainantUsers}
              selectedIds={selectedCoComplainants}
              onChange={setSelectedCoComplainants}
              excludeIds={[]}
            />
          )}
          <p className="text-xs text-[#7D8DA0] mt-1.5">
            You are already set as the primary complainant. Select other delegates who are co-phrasing this issue.
          </p>
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
