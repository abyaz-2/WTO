import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  if (!(await getDatabaseRole(user.id))) {
    redirect("/login");
  }
  return user;
}

export async function requireEb() {
  const user = await requireAuth();
  if (await getDatabaseRole(user.id) !== "executive_board") {
    redirect("/");
  }
  return user;
}

export async function getDatabaseRole(supabaseId: string): Promise<Role | null> {
  const [profile] = await db.select({ role: users.role, isActive: users.isActive }).from(users).where(eq(users.supabaseId, supabaseId)).limit(1);
  if (!profile?.isActive) return null;
  return profile.role === "executive_board" || profile.role === "delegate" ? profile.role : null;
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
