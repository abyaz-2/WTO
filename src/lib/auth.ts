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
    redirect("/login");
  }
  return user;
}

export async function requireEb() {
  const user = await requireAuth();
  if (getRole(user) !== "executive_board") {
    redirect("/");
  }
  return user;
}

function getAdminEmails(): string[] {
  const configuredEmails = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  return configuredEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!isAdminEmail(user.email)) {
    redirect("/");
  }
  return user;
}

export async function requireGuest() {
  const user = await getUser();
  if (user) {
    redirect("/");
  }
}

export type Role = "executive_board" | "delegate";

export function getRole(user: { user_metadata?: { role?: string } }): Role | null {
  const role = user.user_metadata?.role;
  if (role === "executive_board" || role === "delegate") return role;
  return null;
}
