import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

export async function requireGuest() {
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }
}

export type Role = "executive_board" | "delegate";

export function getRole(user: { user_metadata?: { role?: string } }): Role | null {
  const role = user.user_metadata?.role;
  if (role === "executive_board" || role === "delegate") return role;
  return null;
}
