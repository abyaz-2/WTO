import { getUser } from "@/lib/auth";
import DashboardStatsClient from "./DashboardStatsClient";

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <h1 className="font-bold text-2xl text-white tracking-tight">
          Welcome back{user ? `, ${user.email?.split("@")[0]}` : ""}
        </h1>
        <p className="text-[#B6C3D1] mt-2">
          This is your dispute documentation dashboard.
        </p>

        <DashboardStatsClient />
      </div>
    </div>
  );
}
