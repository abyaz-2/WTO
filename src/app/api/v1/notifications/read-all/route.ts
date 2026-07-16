import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { markAllRead } from "@/lib/services/notification";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const result = await markAllRead(user.id);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}
