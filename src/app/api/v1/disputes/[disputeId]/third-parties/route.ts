import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { finaliseThirdParties } from "@/lib/services/dispute";
import { handleApiError, ValidationError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); requireEb(user); await enforceRateLimit("finalise_third_parties", user.id, 30, 3600); const { approvedAssignmentIds = [] } = await request.json(); if (!Array.isArray(approvedAssignmentIds) || !approvedAssignmentIds.every((id) => typeof id === "string")) throw new ValidationError("Invalid third-party selection"); await finaliseThirdParties((await params).disputeId, user.id, approvedAssignmentIds); return Response.json({ success: true }); }
  catch (error) { return handleApiError(error); }
}
