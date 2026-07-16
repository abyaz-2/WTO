import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { updateSubmission } from "@/lib/services/submission";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; submissionId: string }> },
) {
  try {
    const { issueId, submissionId } = await params;
    const user = await getCurrentUser(request);
    const body = await request.json();
    const result = await updateSubmission(issueId, submissionId, { content: body.content }, user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
