import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getReport } from "@/lib/services/ai-report";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    await getCurrentUser(request);
    const { reportId } = await params;
    const report = await getReport(reportId);
    return Response.json(apiResponse(report));
  } catch (error) {
    return handleApiError(error);
  }
}
