import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { UnauthorizedError, ForbiddenError } from "@/lib/services/errors";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
