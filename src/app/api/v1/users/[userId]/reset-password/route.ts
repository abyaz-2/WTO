import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { resetUserPassword } from "@/lib/services/user";
import { handleApiError } from "@/lib/services/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const authUser = await getCurrentUser(request);
    requireEb(authUser);

    const { password } = await request.json();
    if (!password || password.length < 8) {
      return Response.json(
        { detail: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const result = await resetUserPassword(userId, password);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}