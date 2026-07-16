import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { submitSubmission } from "@/lib/services/submission";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; submissionId: string }> },
) {
  try {
    const { issueId, submissionId } = await params;
    const user = await getCurrentUser(request);
    const result = await submitSubmission(issueId, submissionId, user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
