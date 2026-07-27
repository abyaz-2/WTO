import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { importReportContent } from "@/lib/services/report";
import { handleApiError } from "@/lib/services/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ issueId: string; reportId: string }> }) {
  try {
    const auth = await getCurrentUser(request);
    const { issueId, reportId } = await params;
    const body = await request.json();
    const result = await importReportContent(issueId, reportId, body.content, auth.id);
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}