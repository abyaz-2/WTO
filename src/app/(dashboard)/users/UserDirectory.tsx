"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/lib/api";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { motion } from "framer-motion";
import type { User } from "@/lib/types";

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    executive_board: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    delegate: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  };

  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
        colors[role] ?? "bg-[rgba(255,255,255,0.06)] text-[#B6C3D1]"
      }`}
    >
      {role === "executive_board" ? "Executive Board" : "Delegate"}
    </span>
  );
}

export default function UserDirectory() {
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)]">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/4" />
              <Skeleton variant="text" className="w-1/3" />
            </div>
            <Skeleton variant="text" className="w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-400">Failed to load users.</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <EmptyState
        title="No users found"
        description="There are no registered users yet."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border border-[rgba(255,255,255,0.08)] rounded-[12px] overflow-hidden"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.06)]">
            <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">User</th>
            <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Email</th>
            <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Role</th>
            <th className="text-left px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[#7D8DA0]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
          {users.map((user: User, index: number) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-medium text-[#B6C3D1]">
                    {user.display_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) ?? "??"}
                  </div>
                  <span className="text-sm font-medium text-white">{user.display_name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-[#B6C3D1]">{user.email}</td>
              <td className="px-5 py-4">
                <RoleBadge role={user.role} />
              </td>
              <td className="px-5 py-4">
                <span
                  className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                    user.is_active
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {user.is_active ? "Active" : "Inactive"}
                </span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
