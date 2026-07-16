import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { markRead } from "@/lib/services/notification";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  try {
    const user = await getCurrentUser(request);
    const { notificationId } = await params;
    const result = await markRead(notificationId, user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
