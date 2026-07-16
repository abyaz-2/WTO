import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { uploadEvidence, listEvidence } from "@/lib/services/evidence";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const result = await listEvidence(issueId);
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
    const formData = await request.formData();
    const result = await uploadEvidence(issueId, formData, user.id);
    return Response.json(apiResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
