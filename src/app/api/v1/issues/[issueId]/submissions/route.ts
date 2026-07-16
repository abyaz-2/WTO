import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { createSubmission, listSubmissions } from "@/lib/services/submission";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const user = await getCurrentUser(request);
    const result = await listSubmissions(issueId, user.id, user.role);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const user = await getCurrentUser(request);
    const body = await request.json();
    const { participantId, submissionType, content } = body;
    const result = await createSubmission(issueId, participantId, submissionType, content || {}, user.id);
    return Response.json(apiResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
