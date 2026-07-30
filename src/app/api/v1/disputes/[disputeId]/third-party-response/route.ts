import { NextRequest } from "next/server";
import { getCurrentUser, requireRole } from "@/lib/middleware/auth";
import { respondThirdParty } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); requireRole(user, ["delegate"]); await enforceRateLimit("third_party_response", user.id, 20, 3600); const { response } = await request.json(); if (response !== "yes" && response !== "no") throw new Error("Invalid response"); await respondThirdParty((await params).disputeId, user.id, response); return Response.json({ success: true }); }
  catch (error) { return handleApiError(error); }
}
