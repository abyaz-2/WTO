import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getIssue, updateIssue, archiveIssue } from "@/lib/services/issue";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const result = await getIssue(issueId);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { issueId } = await params;
    const body = await request.json();
    const result = await updateIssue(issueId, body, user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { issueId } = await params;
    const result = await archiveIssue(issueId, user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
