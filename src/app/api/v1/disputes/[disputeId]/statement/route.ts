import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { submitStatement } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); await enforceRateLimit("submit_statement", user.id, 10, 3600); const { content } = await request.json(); await submitStatement((await params).disputeId, user.id, content); return Response.json({ success: true }); }
  catch (error) { return handleApiError(error); }
}
