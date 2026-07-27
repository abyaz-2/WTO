import { NextRequest } from "next/server";
import { getCurrentUser, requireEb } from "@/lib/middleware/auth";
import { deleteUser } from "@/lib/services/user";
import { handleApiError } from "@/lib/services/errors";

export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authUser = await getCurrentUser(request);
    requireEb(authUser);

    const result = await deleteUser(params.userId, authUser.id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}