import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { reviewFactCheck } from "@/lib/services/fact-check";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ factCheckId: string }> }) {
  try {
    const auth = await getCurrentUser(request);
    const { factCheckId } = await params;
    const body = await request.json();
    const { status, comments } = body;
    const factCheck = await reviewFactCheck(factCheckId, { status, comments }, auth.id);
    return Response.json(apiResponse(factCheck));
  } catch (error) {
    return handleApiError(error);
  }
}
