import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { deleteEvidence } from "@/lib/services/evidence";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string; evidenceId: string }> },
) {
  try {
    const { issueId, evidenceId } = await params;
    const user = await getCurrentUser(request);
    const result = await deleteEvidence(issueId, evidenceId, user.id, user.role);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
