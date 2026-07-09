import { requireAuth } from "@/lib/auth";
import UserDirectory from "./UserDirectory";

export default async function UsersPage() {
  await requireAuth();

  return (
    <div className="p-6 sm:p-8 lg:p-10">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">User Directory</h1>
          <p className="text-sm text-[#B6C3D1] mt-1">All registered platform users</p>
        </div>

        <UserDirectory />
      </div>
    </div>
  );
}
