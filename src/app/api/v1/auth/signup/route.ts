import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handleApiError, apiResponse, ValidationError, ConflictError } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const { email, password, display_name, role } = await request.json();

    if (!email || !password || !display_name || !role) {
      throw new ValidationError("Email, password, display name, and role are required");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }

    if (!["delegate", "executive_board"].includes(role)) {
      throw new ValidationError("Role must be 'delegate' or 'executive_board'");
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      throw new ConflictError("A user with this email already exists.");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          display_name,
          role,
        },
      }),
    });

    if (!signupRes.ok) {
      const err = await signupRes.json();
      throw new ValidationError(err.msg || err.error_description || "Failed to create account");
    }

    const supabaseUser = await signupRes.json();

    const [user] = await db
      .insert(users)
      .values({
        supabaseId: supabaseUser.id,
        email,
        displayName: display_name,
        role,
        isActive: true,
      })
      .returning();

    return Response.json(
      apiResponse({ userId: user.id, email: user.email, displayName: user.displayName, role: user.role }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
