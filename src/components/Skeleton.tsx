"use client";

import { motion } from "framer-motion";

interface SkeletonProps {
  variant?: "text" | "card" | "row" | "avatar";
  className?: string;
}

const variants = {
  text: "h-4 w-full rounded-[4px]",
  card: "h-48 w-full rounded-[12px]",
  row: "h-16 w-full rounded-[8px]",
  avatar: "h-10 w-10 rounded-full",
};

export default function Skeleton({ variant = "text", className = "" }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-[rgba(255,255,255,0.06)] ${variants[variant]} ${className}`}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345] space-y-4">
      <Skeleton variant="text" className="w-1/3" />
      <Skeleton variant="text" className="w-2/3" />
      <Skeleton variant="text" className="w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)]">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-2/3" />
      </div>
    </div>
  );
}

export function IssueListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)]"
        >
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="w-24" />
          <Skeleton variant="avatar" />
        </div>
      ))}
    </div>
  );
}
