import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, apiResponse, ValidationError, UnauthorizedError } from "@/lib/services/errors";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await enforceRateLimit("login", `${clientIp}|${String(email).trim().toLowerCase()}`, 5, 300);

    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    let loginRes: Response;
    try {
      loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new ValidationError(
        `Unable to reach Supabase at ${supabaseUrl}. Check SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.`,
      );
    }

    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new UnauthorizedError(err.error_description || err.msg || "Invalid email or password");
    }

    const session = await loginRes.json();

    const [profile] = await db.select({ id: users.id, isActive: users.isActive })
      .from(users).where(eq(users.supabaseId, session.user.id)).limit(1);
    if (!profile?.isActive) throw new UnauthorizedError("This account is not active");
    await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, profile.id));

    return Response.json(
      apiResponse({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: session.token_type,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
