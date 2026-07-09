import { requireAuth } from "@/lib/auth";
import { Suspense } from "react";
import IssueList from "@/components/IssueList";
import { IssueListSkeleton } from "@/components/Skeleton";

export default async function IssuesPage() {
  await requireAuth();

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Issues</h1>
            <p className="text-sm text-[#B6C3D1] mt-1">Manage trade dispute issues</p>
          </div>
        </div>

        <Suspense fallback={<IssueListSkeleton />}>
          <IssueList />
        </Suspense>
      </div>
    </div>
  );
}
