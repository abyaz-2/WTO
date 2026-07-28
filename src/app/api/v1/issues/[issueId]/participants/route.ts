import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { listParticipants, registerParticipant } from "@/lib/services/participant";
import { handleApiError } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const result = await listParticipants(issueId);
    return Response.json(result);
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
    const targetUserId = body.userId ?? user.id;
    const result = await registerParticipant(issueId, targetUserId, body.role, user.role, user.id);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
