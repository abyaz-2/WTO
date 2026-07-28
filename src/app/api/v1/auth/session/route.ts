import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    return Response.json({ user });
  } catch {
    return Response.json({ user: null });
  }
}
