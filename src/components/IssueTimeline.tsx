"use client";

import { motion } from "framer-motion";
import type { TimelineEvent } from "@/lib/types";

interface IssueTimelineProps {
  events?: TimelineEvent[];
}

const eventIcons: Record<string, string> = {
  created: "●",
  status_change: "◆",
  submission: "◉",
  evidence: "▣",
  review: "◎",
  comment: "○",
  approval: "✓",
  rejection: "✗",
};

function getIcon(type: string): string {
  return eventIcons[type] || "○";
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function IssueTimeline({ events }: IssueTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#7D8DA0]">No events recorded yet</p>
      </div>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-[rgba(255,255,255,0.08)]" />

      <div className="space-y-0">
        {sorted.map((event, index) => {
          const isLatest = index === 0;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="relative flex gap-4 pb-8 last:pb-0"
            >
              <div className="relative z-10 flex-shrink-0 mt-0.5">
                <div
                  className={`w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs border-2 ${
                    isLatest
                      ? "bg-[#1E6FE8] border-[#1E6FE8] text-white"
                      : index < sorted.length - 1
                        ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.16)] text-[#B6C3D1]"
                        : "bg-transparent border-[rgba(255,255,255,0.16)] text-[#7D8DA0]"
                  }`}
                >
                  {getIcon(event.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-white">{event.title}</h4>
                  <span className="text-xs text-[#7D8DA0]">{formatTime(event.created_at)}</span>
                </div>
                {event.actor_name && (
                  <p className="text-xs text-[#6CA9FF] mt-0.5">{event.actor_name}</p>
                )}
                {event.description && (
                  <p className="text-sm text-[#B6C3D1] mt-1.5 leading-relaxed">{event.description}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
