import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { listUsers, createUser } from "@/lib/services/user";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const result = await listUsers();
    return Response.json(apiResponse(result));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    requireEb(user);
    const body = await request.json();
    const result = await createUser(body);
    return Response.json(apiResponse(result), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
