import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { changeRole, removeParticipant } from "@/lib/services/participant";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; participantId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { issueId, participantId } = await params;
    const body = await request.json();
    const result = await changeRole(issueId, participantId, body.role, user.role);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; participantId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { issueId, participantId } = await params;
    const result = await removeParticipant(issueId, participantId, user.role);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
