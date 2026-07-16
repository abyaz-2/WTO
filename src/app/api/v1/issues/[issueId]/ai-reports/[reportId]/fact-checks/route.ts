import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { listFactChecks, submitFactCheck } from "@/lib/services/fact-check";
import { handleApiError, apiResponse } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    await getCurrentUser(request);
    const { reportId } = await params;
    const factChecks = await listFactChecks(reportId);
    return Response.json(apiResponse(factChecks));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await getCurrentUser(request);
    const { reportId } = await params;
    const body = await request.json();
    const { participantId, status, comments } = body;
    const factCheck = await submitFactCheck(reportId, participantId, { status, comments }, auth.id);
    return Response.json(apiResponse(factCheck), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
