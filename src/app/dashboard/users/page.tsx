import { redirect } from "next/navigation";

export default async function DashboardUsersPage() {
  redirect("/users");
}
