import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getSignedUrl } from "@/lib/services/evidence";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const { evidenceId } = body;
    const signedUrl = await getSignedUrl(evidenceId, user.id);
    return Response.json(apiResponse({ signedUrl }));
  } catch (error) {
    return handleApiError(error);
  }
}
