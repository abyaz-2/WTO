"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Notification } from "@/lib/types";

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps): ReactNode {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-[#0B2345] border border-[rgba(255,255,255,0.08)] hover:bg-[#112F5A] transition-colors duration-200"
      >
        <svg className="w-4 h-4 text-[#B6C3D1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] shadow-2xl overflow-hidden z-50"
          >
            <div className="px-5 py-3 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium text-[#6CA9FF]">{unreadCount} unread</span>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-[rgba(255,255,255,0.06)]">
              {loading ? (
                <div className="px-5 py-8 text-center">
                  <div className="w-5 h-5 border-2 border-[#1E6FE8] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#7D8DA0]">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    onClick={() => setIsOpen(false)}
                    className="block px-5 py-3 hover:bg-[#112F5A] transition-colors duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base shrink-0 mt-0.5">
                        {getTypeIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-white leading-snug">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-[#1E6FE8] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-[#7D8DA0] mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-[10px] text-[#7D8DA0] mt-1">
                          {new Date(notification.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="block px-5 py-3 text-center text-xs font-medium text-[#6CA9FF] hover:text-white border-t border-[rgba(255,255,255,0.08)] transition-colors duration-200"
            >
              View All
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
