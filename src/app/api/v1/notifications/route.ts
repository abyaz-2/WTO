import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { listNotifications, createNotification } from "@/lib/services/notification";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "20", 10);
    const unreadOnly = searchParams.get("unread") === "true";
    const result = await listNotifications(user.id, page, perPage, unreadOnly || undefined);
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const notification = await createNotification(
      user.id,
      body.type,
      body.content,
    );
    return Response.json(apiResponse(notification));
  } catch (error) {
    return handleApiError(error);
  }
}
