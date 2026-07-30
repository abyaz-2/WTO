import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/services/errors";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { revealDelegateCredential } from "@/lib/security/delegate-credentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ countryId: string }> }) {
  try {
    const actor = await getCurrentUser(request);
    requireEb(actor);
    await enforceRateLimit("reveal_delegate_credential", actor.id, 30, 3600);
    const { countryId } = await params;
    return Response.json({ password: await revealDelegateCredential(countryId, actor.id) });
  } catch (error) {
    return handleApiError(error);
  }
}
