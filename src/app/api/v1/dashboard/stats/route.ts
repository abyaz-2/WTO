import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getDashboardStats } from "@/lib/services/dashboard";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUser(request);
    const stats = await getDashboardStats(auth.id);
    return Response.json(apiResponse(stats));
  } catch (error) {
    return handleApiError(error);
  }
}
