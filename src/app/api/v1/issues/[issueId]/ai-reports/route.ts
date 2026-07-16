import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { listReports } from "@/lib/services/ai-report";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const reports = await listReports(issueId);
    return Response.json(apiResponse(reports));
  } catch (error) {
    return handleApiError(error);
  }
}
