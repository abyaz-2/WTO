import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { transitionStatus } from "@/lib/services/issue";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { issueId } = await params;
    const body = await request.json();
    const result = await transitionStatus(issueId, body.targetStatus, user.id, user.role);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
