import { requireAuth } from "@/lib/auth";
import CreateIssueForm from "./CreateIssueForm";

export default async function NewIssuePage() {
  await requireAuth();

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-[var(--content-width,1200px)] mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Create New Issue</h1>
          <p className="text-sm text-[#B6C3D1] mt-1">
            Submit a new trade dispute issue for EB review
          </p>
        </div>

        <CreateIssueForm />
      </div>
    </div>
  );
}
