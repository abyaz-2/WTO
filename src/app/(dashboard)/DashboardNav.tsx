"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/issues", label: "Issues" },
];

interface DashboardNavProps {
  user: User;
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <aside className="w-60 min-h-screen border-r border-[rgba(255,255,255,0.06)] bg-[#05162D] flex flex-col">
      <div className="px-6 py-8 border-b border-[rgba(255,255,255,0.06)]">
        <span className="text-sm font-semibold text-white tracking-tight">WTO</span>
        <span className="block text-xs text-[#7D8DA0] mt-1">Dispute Platform</span>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2.5 text-sm rounded-[8px] transition-colors duration-200 ${
                isActive
                  ? "bg-[#0B2345] text-white font-medium"
                  : "text-[#B6C3D1] hover:text-white hover:bg-[#0B2345]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="px-3 py-2">
          <p className="text-sm text-white truncate">
            {user.email ?? "User"}
          </p>
          <p className="text-xs text-[#7D8DA0] mt-0.5 capitalize">
            {user.user_metadata?.role ?? "delegate"}
          </p>
        </div>
      </div>
    </aside>
  );
}
