"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Notification } from "@/lib/types";

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 20;

export default function NotificationsPage(): ReactNode {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(ITEMS_PER_PAGE),
      });
      if (filter === "unread") params.set("unread", "true");
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      fetchNotifications();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  }

  function getTypeIcon(type: string): string {
    switch (type) {
      case "report_generated": return "📄";
      case "review_requested": return "🔍";
      case "correction_submitted": return "✏️";
      case "correction_accepted": return "✅";
      case "correction_rejected": return "❌";
      case "published": return "📢";
      case "deadline": return "⏰";
      default: return "🔔";
    }
  }

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  if (loading && !data) {
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

  if (error && !data) {
    return (
      <div className="p-8 sm:p-12">
        <div className="max-w-[var(--content-width,1200px)] mx-auto">
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={fetchNotifications} className="mt-3 px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors duration-200">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Notifications</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">
              {total} notification{total !== 1 ? "s" : ""}
              {unreadCount > 0 && ` (${unreadCount} unread)`}
            </p>
          </div>
          <button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
            className="px-4 py-2 text-xs font-medium text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {markingAll ? "Marking..." : "Mark All Read"}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center bg-[#112F5A] rounded-[8px] p-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-1.5 text-xs font-medium rounded-[6px] transition-colors duration-200 capitalize ${
                  filter === f ? "bg-[#1E6FE8] text-white" : "text-[#7D8DA0] hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-12 text-center">
            <p className="text-sm text-[#7D8DA0]">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, idx) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <Link
                  href={notification.link}
                  className={`block rounded-[12px] border p-4 transition-colors duration-200 ${
                    !notification.read
                      ? "border-[#1E6FE8]/20 bg-[#1E6FE8]/5"
                      : "border-[rgba(255,255,255,0.08)] bg-[#0B2345] hover:bg-[#112F5A]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-lg shrink-0 mt-0.5">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm ${!notification.read ? "font-semibold text-white" : "font-medium text-[#B6C3D1]"}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-[#1E6FE8] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#7D8DA0] mt-1 leading-relaxed line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                        <span className="text-[11px] text-[#7D8DA0] shrink-0 whitespace-nowrap">
                          {new Date(notification.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 text-xs font-medium rounded-[6px] transition-colors duration-200 ${
                    p === page
                      ? "bg-[#1E6FE8] text-white"
                      : "text-[#B6C3D1] hover:text-white bg-[#0B2345]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 text-xs font-medium text-[#B6C3D1] hover:text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
