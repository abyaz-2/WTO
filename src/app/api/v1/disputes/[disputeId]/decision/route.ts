import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { ebDecision } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); requireEb(user); await enforceRateLimit("eb_decision", user.id, 60, 3600); const { decision } = await request.json(); if (decision !== "approve" && decision !== "reject") throw new Error("Invalid decision"); return Response.json(await ebDecision((await params).disputeId, user.id, decision)); }
  catch (error) { return handleApiError(error); }
}
