import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/middleware/auth";
import { createIssue, listIssues, listArchiveIssues } from "@/lib/services/issue";
import { handleApiError } from "@/lib/services/errors";

export async function GET(request: NextRequest) {
  try {
    const _user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("per_page") ?? searchParams.get("limit") ?? "20", 10);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    if (status === "archived") {
      const result = await listArchiveIssues(page, perPage, search);
      return Response.json(result);
    }

    const result = await listIssues(page, perPage, { status, search });
    return Response.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();
    const result = await createIssue(
      {
        title: body.title,
        description: body.description,
        respondentId: body.respondentId,
        coComplainantIds: body.coComplainantIds,
      },
      user.id,
    );
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
