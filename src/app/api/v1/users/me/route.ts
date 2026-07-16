import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getUser, updateUser } from "@/lib/services/user";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request);
    const user = await getUser(auth.id);
    return Response.json(apiResponse(user));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request);
    const body = await request.json();
    const user = await updateUser(auth.id, body);
    return Response.json(apiResponse(user));
  } catch (error) {
    return handleApiError(error);
  }
}
