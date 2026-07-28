import { requireAdmin } from "@/lib/auth";
import UserDirectory from "@/app/(dashboard)/users/UserDirectory";

export default async function UsersPage() {
  await requireAdmin();

  return (
    <div className="p-8 sm:p-10 lg:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#6CA9FF] mb-3">
              Admin Console
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight">Users</h1>
            <p className="text-sm text-[#B6C3D1] mt-2 max-w-2xl">
              Add users with an email, country, and password, or remove access when needed.
            </p>
          </div>
        </div>

        <UserDirectory />
      </div>
    </div>
  );
}
