import { getUser } from "@/lib/auth";

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
            <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">Active Issues</p>
            <p className="text-3xl font-bold text-white mt-2">0</p>
          </div>

          <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
            <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">My Submissions</p>
            <p className="text-3xl font-bold text-white mt-2">0</p>
          </div>

          <div className="p-6 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]">
            <p className="text-xs font-medium tracking-wider uppercase text-[#7D8DA0]">Pending Reviews</p>
            <p className="text-3xl font-bold text-white mt-2">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
