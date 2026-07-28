import { requireAuth } from "@/lib/auth";
import NotificationsPage from "@/app/(dashboard)/notifications/page";

export default async function DashboardNotificationsPage() {
  await requireAuth();
  return <NotificationsPage />;
}
