import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { listParticipants, registerParticipant } from "@/lib/services/participant";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const result = await listParticipants(issueId);
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
    const user = await getCurrentUser(request);
    const { issueId } = await params;
    const body = await request.json();
    const result = await registerParticipant(issueId, body.userId, body.role, user.role);
    return Response.json(apiResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
