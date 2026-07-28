import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { getUser, updateUser, deleteUser } from "@/lib/services/user";
import { handleApiError } from "@/lib/services/errors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const authUser = await getCurrentUser(request);
    requireEb(authUser);
    const user = await getUser(userId);
    return Response.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const authUser = await getCurrentUser(request);
    requireEb(authUser);
    const body = await request.json();
    const user = await updateUser(userId, body);
    return Response.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const authUser = await getCurrentUser(request);
    requireEb(authUser);
    const result = await deleteUser(userId, authUser.id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}