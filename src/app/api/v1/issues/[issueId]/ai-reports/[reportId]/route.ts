import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getReport } from "@/lib/services/report";
import { handleApiError } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    await getCurrentUser(request);
    const { reportId } = await params;
    const report = await getReport(reportId);
    return Response.json(report);
  } catch (error) {
    return handleApiError(error);
  }
}