import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { closeStatements } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); requireEb(user); await enforceRateLimit("close_statements", user.id, 30, 3600); return Response.json(await closeStatements((await params).disputeId, user.id)); }
  catch (error) { return handleApiError(error); }
}
