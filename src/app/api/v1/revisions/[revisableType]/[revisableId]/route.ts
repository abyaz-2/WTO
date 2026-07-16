import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { listRevisions, createRevision } from "@/lib/services/revision";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ revisableType: string; revisableId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { revisableType, revisableId } = await params;
    const result = await listRevisions(revisableType, revisableId);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ revisableType: string; revisableId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { revisableType, revisableId } = await params;
    const body = await request.json();
    const result = await createRevision(
      revisableType,
      revisableId,
      body.changes,
      user.id,
      body.reason,
    );
    return Response.json(apiResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
