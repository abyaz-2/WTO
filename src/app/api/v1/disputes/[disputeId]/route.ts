import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getDispute } from "@/lib/services/dispute";
import { handleApiError } from "@/lib/services/errors";
export async function GET(request: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try { const user = await getCurrentUser(request); return Response.json(await getDispute((await params).disputeId, user)); }
  catch (error) { return handleApiError(error); }
}
