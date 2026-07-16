import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { generateReport } from "@/lib/services/ai-report";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    const auth = await getCurrentUser(request);
    const { issueId } = await params;
    const report = await generateReport(issueId, auth.id);
    return Response.json(apiResponse(report), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
