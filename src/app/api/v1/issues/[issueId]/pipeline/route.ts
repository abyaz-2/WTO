import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getPipelineStatus } from "@/lib/services/ai-report";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const pipeline = await getPipelineStatus(issueId);
    return Response.json(apiResponse(pipeline));
  } catch (error) {
    return handleApiError(error);
  }
}
