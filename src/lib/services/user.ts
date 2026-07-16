import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { NotFoundError, ConflictError, ValidationError } from "./errors";

export type UserRole = "executive_board" | "delegate";

export async function createUser(data: {
  email: string;
  displayName: string;
  role: UserRole;
}) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const tempPassword = crypto.randomBytes(12).toString("hex");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      email: data.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { role: data.role, display_name: data.displayName },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new ValidationError(err.msg || "Failed to create user in Supabase");
  }

  const supabaseUser = await response.json();

  const [user] = await db
    .insert(users)
    .values({
      supabaseId: supabaseUser.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      isActive: true,
    })
    .returning();

  return { user, tempPassword };
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function updateUser(userId: string, data: { displayName?: string; avatarUrl?: string }) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function listUsers() {
  return db.select().from(users).orderBy(users.createdAt);
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function getOrCreateUserFromSupabase(supabaseUser: {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}) {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, supabaseUser.id))
    .limit(1);

  if (existing) return existing;

  const [user] = await db
    .insert(users)
    .values({
      supabaseId: supabaseUser.id,
      email: supabaseUser.email,
      displayName: (supabaseUser.user_metadata?.display_name as string) || supabaseUser.email.split("@")[0],
      role: (supabaseUser.user_metadata?.role as UserRole) || "delegate",
      isActive: true,
    })
    .returning();

  return user;
}
