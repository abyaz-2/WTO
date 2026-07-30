import { db } from "@/lib/db";
import { countryAssignments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from "./errors";
import { getSupabaseUrl } from "@/lib/supabase/config";
import { createClient as createSupabaseClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { storeDelegateCredential } from "@/lib/security/delegate-credentials";

export type UserRole = "executive_board" | "delegate";

function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!serviceRoleKey) {
    throw new ValidationError("Missing Supabase service role key");
  }

  return serviceRoleKey;
}

function getSupabaseAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey());
}

function isDatabaseConnectivityError(error: unknown) {
  const errorCode = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const errorMessage = error instanceof Error ? error.message : "";

  return (
    ["ENOTFOUND", "SELF_SIGNED_CERT_IN_CHAIN", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(errorCode) ||
    /Failed query|getaddrinfo|certificate/i.test(errorMessage)
  );
}

function mapAuthUserToRow(authUser: SupabaseAuthUser, role: UserRole = "delegate") {
  const displayName =
    (authUser.user_metadata?.display_name as string | undefined) ||
    (authUser.user_metadata?.full_name as string | undefined) ||
    authUser.email?.split("@")[0] ||
    "User";

  return {
    id: authUser.id,
    createdAt: authUser.created_at ?? new Date().toISOString(),
    updatedAt: authUser.updated_at ?? authUser.created_at ?? new Date().toISOString(),
    supabaseId: authUser.id,
    email: authUser.email ?? "",
    displayName,
    country: (authUser.user_metadata?.country as string | undefined) ?? null,
    avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    role,
    isActive: true,
    lastLoginAt: authUser.last_sign_in_at ?? null,
    metadata: authUser.user_metadata ?? null,
  };
}

export async function createUser(data: {
  email: string;
  country: string;
  password: string;
  role?: UserRole;
}) {
  try {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing) {
      throw new ConflictError("Email already registered");
    }
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }
  }

  const displayName = data.email.split("@")[0];

  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getSupabaseServiceRoleKey();
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: data.role ?? "delegate", display_name: displayName, country: data.country },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new ValidationError(err.msg || "Failed to create user in Supabase");
  }

  const supabaseUser = await response.json();

  try {
    const [user] = await db
      .insert(users)
      .values({
        supabaseId: supabaseUser.id,
        email: data.email,
        displayName,
        country: data.country,
        role: data.role ?? "delegate",
        isActive: true,
      })
      .returning();

    return { user };
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }

    return {
      user: mapAuthUserToRow(
        {
          id: supabaseUser.id,
          email: data.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sign_in_at: null,
          user_metadata: {
            role: data.role ?? "delegate",
            display_name: displayName,
            country: data.country,
          },
        } as unknown as SupabaseAuthUser,
        data.role ?? "delegate",
      ),
    };
  }
}

export async function deleteUser(userId: string, currentUserId: string) {
  if (userId === currentUserId) {
    throw new ForbiddenError("You cannot remove your own admin account");
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseServiceKey = getSupabaseServiceRoleKey();

  let existing: typeof users.$inferSelect | null = null;
  try {
    [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }
  }

  const supabaseId = existing?.supabaseId ?? userId;

  const authDeleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${supabaseId}`, {
    method: "DELETE",
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  });

  if (!authDeleteRes.ok) {
    const err = await authDeleteRes.json().catch(() => ({}));
    throw new ValidationError(err.msg || err.error_description || "Failed to remove user from Supabase Auth");
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(users.id, userId))
      .returning();

    return updated;
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }

    return {
      id: userId,
      supabaseId,
      isActive: false,
    };
  }
}

export async function getUser(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function updateUser(userId: string, data: { displayName?: string; avatarUrl?: string; role?: UserRole; isActive?: boolean; country?: string | null }) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(users.id, userId))
    .returning();
  if (!user) throw new NotFoundError("User");
  return user;
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(user.supabaseId, {
    password: newPassword,
  });

  if (error) {
    throw new ValidationError(error.message || "Failed to reset password");
  }

  const [assignment] = await db.select({ id: countryAssignments.id }).from(countryAssignments).where(eq(countryAssignments.userId, userId)).limit(1);
  if (assignment) await storeDelegateCredential(assignment.id, newPassword);

  return { success: true };
}

export async function listUsers() {
  try {
    const result = await db.select().from(users).orderBy(users.createdAt);
    if (result.length > 0) return result;
  } catch (error) {
    if (!isDatabaseConnectivityError(error)) {
      throw error;
    }
  }

  const supabase = getSupabaseAdminClient();
  const { data, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    throw new ValidationError(listError.message || "Failed to load users from Supabase Auth");
  }

  return data.users.map((authUser) => mapAuthUserToRow(authUser));
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
