import { NextRequest } from "next/server";
import { getCurrentUser, requireRole } from "@/lib/middleware/auth";
import { createDispute, listDisputes } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function GET(request: NextRequest) {
  try { const user = await getCurrentUser(request); return Response.json(await listDisputes(user.id, user.role)); }
  catch (error) { return handleApiError(error); }
}
export async function POST(request: NextRequest) {
  try { const user = await getCurrentUser(request); requireRole(user, ["delegate"]); await enforceRateLimit("create_dispute", user.id, 10, 3600); return Response.json(await createDispute(user.id, await request.json()), { status: 201 }); }
  catch (error) { return handleApiError(error); }
}
