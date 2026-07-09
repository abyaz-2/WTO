import { requireAuth } from "@/lib/auth";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-[#05162D] flex">
      <DashboardNav user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
