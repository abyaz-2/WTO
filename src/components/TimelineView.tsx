"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  type: "submission" | "pipeline" | "review" | "correction" | "approval" | "publication" | "archive";
  title: string;
  description: string;
  date: string;
  subEvents?: TimelineEvent[];
  details?: string;
}

interface TimelineViewProps {
  events: TimelineEvent[];
}

function getEventColor(type: TimelineEvent["type"]): string {
  switch (type) {
    case "submission":
      return "border-l-[#6CA9FF]";
    case "pipeline":
      return "border-l-amber-400";
    case "review":
      return "border-l-[#1E6FE8]";
    case "correction":
      return "border-l-orange-400";
    case "approval":
      return "border-l-green-400";
    case "publication":
      return "border-l-purple-400";
    case "archive":
      return "border-l-[#7D8DA0]";
    default:
      return "border-l-[#7D8DA0]";
  }
}

function getEventDotColor(type: TimelineEvent["type"]): string {
  switch (type) {
    case "submission":
      return "bg-[#6CA9FF]";
    case "pipeline":
      return "bg-amber-400";
    case "review":
      return "bg-[#1E6FE8]";
    case "correction":
      return "bg-orange-400";
    case "approval":
      return "bg-green-400";
    case "publication":
      return "bg-purple-400";
    case "archive":
      return "bg-[#7D8DA0]";
    default:
      return "bg-[#7D8DA0]";
  }
}

function TimelineEventNode({ event, index }: { event: TimelineEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="relative pl-8 pb-8 last:pb-0"
    >
      <div className={`absolute left-0 top-1 w-3 h-3 rounded-full ${getEventDotColor(event.type)} ring-4 ring-[#05162D] z-10`} />
      {event.subEvents && event.subEvents.length > 0 && (
        <div className="absolute left-[5px] top-4 bottom-0 w-0.5 bg-[rgba(255,255,255,0.06)]" />
      )}
      <div className={`rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] px-5 py-4 hover:bg-[#112F5A] transition-colors duration-200 cursor-pointer border-l-4 ${getEventColor(event.type)}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">{event.title}</h4>
            <p className="text-xs text-[#B6C3D1] mt-1 leading-relaxed">{event.description}</p>
            {event.details && <p className="text-xs text-[#7D8DA0] mt-2">{event.details}</p>}
          </div>
          <span className="text-[11px] text-[#7D8DA0] whitespace-nowrap shrink-0">
            {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        {event.subEvents && event.subEvents.length > 0 && (
          <div className="mt-4 ml-4 space-y-2">
            {event.subEvents.map((sub, subIdx) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: subIdx * 0.05, duration: 0.3 }}
                className="flex items-center gap-3 py-1.5"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${getEventDotColor(sub.type)} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#B6C3D1]">{sub.title}</p>
                  {sub.description && (
                    <p className="text-[11px] text-[#7D8DA0]">{sub.description}</p>
                  )}
                </div>
                <span className="text-[10px] text-[#7D8DA0] whitespace-nowrap">
                  {new Date(sub.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function TimelineView({ events }: TimelineViewProps): ReactNode {
  if (events.length === 0) {
    return (
      <div className="rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] p-6">
        <p className="text-sm text-[#7D8DA0] text-center">No timeline events available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[5px] top-3 bottom-3 w-0.5 bg-[rgba(255,255,255,0.06)]" />
      <div className="space-y-0">
        {events.map((event, idx) => (
          <TimelineEventNode key={event.id} event={event} index={idx} />
        ))}
      </div>
    </div>
  );
}
