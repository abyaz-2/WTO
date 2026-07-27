import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { getIssue } from "@/lib/services/issue";
import { handleApiError } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;
    const issue = await getIssue(issueId);
    return Response.json(issue);
  } catch (error) {
    return handleApiError(error);
  }
}