"use client";

import { useQuery } from "@tanstack/react-query";

export default function DashboardStatsClient() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/v1/dashboard/stats").then(r => r.json()),
  });

  const stats = data?.data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
      <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
        <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">Active Issues</p>
        <p className="text-3xl font-bold text-white mt-2">{stats?.active_issues ?? "..."}</p>
      </div>

      <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
        <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">My Submissions</p>
        <p className="text-3xl font-bold text-white mt-2">{stats?.my_submissions ?? "..."}</p>
      </div>

      <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
        <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">Pending Reviews</p>
        <p className="text-3xl font-bold text-white mt-2">{stats?.pending_reviews ?? "..."}</p>
      </div>
    </div>
  );
}
