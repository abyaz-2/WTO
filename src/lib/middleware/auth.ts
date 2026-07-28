import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError } from "@/lib/services/errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

export interface AuthUser {
  id: string;
  supabaseId: string;
  email: string;
  displayName: string;
  role: "executive_board" | "delegate";
  isActive: boolean;
}

export async function getCurrentUser(request: NextRequest): Promise<AuthUser> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid authorization header");
  }

  const token = authHeader.slice(7);

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new UnauthorizedError("Invalid or expired token");
  }

  const supabaseUser = await response.json();

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, supabaseUser.id))
        .limit(1);

      if (!user) {
        throw new UnauthorizedError("User not found");
      }

      if (!user.isActive) {
        throw new UnauthorizedError("Account is deactivated");
      }

      return {
        id: user.id,
        supabaseId: user.supabaseId,
        email: user.email,
        displayName: user.displayName,
        role: user.role as "executive_board" | "delegate",
        isActive: user.isActive,
      };
    } catch (error) {
      const errorCode = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
      const errorMessage = error instanceof Error ? error.message : "";
      const isConnectivityError =
        ["ENOTFOUND", "SELF_SIGNED_CERT_IN_CHAIN", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(errorCode) ||
        /Failed query|getaddrinfo|certificate/i.test(errorMessage);

      if (!isConnectivityError) {
        throw error;
      }

      return {
        id: supabaseUser.id,
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        displayName:
          supabaseUser.user_metadata?.display_name ||
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split("@")[0] ||
          "User",
        role: isAdminEmail(supabaseUser.email) || supabaseUser.user_metadata?.role === "executive_board"
          ? "executive_board"
          : "delegate",
        isActive: true,
      };
    }
}

export function requireRole(user: AuthUser, allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError("Insufficient permissions");
  }
}

export function requireEb(user: AuthUser) {
  requireRole(user, ["executive_board"]);
}

export async function authenticateRequest(request: NextRequest): Promise<AuthUser> {
  try {
    return await getCurrentUser(request);
  } catch (error) {
    throw error;
  }
}
