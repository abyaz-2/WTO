import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

function mapIssueToArchiveItem(issue: any) {
  const parties = (issue.participants || []).map((p: any) =>
    typeof p.user === "object" && p.user !== null
      ? p.user.display_name || p.user.name || p.role
      : p.role
  );

  return {
    id: issue.id,
    number: issue.issue_number,
    title: issue.title,
    parties,
    published_at: issue.created_at,
    archived_at: issue.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const per_page = searchParams.get("per_page") || "20";
  const search = searchParams.get("search") || "";

  try {
    const params = new URLSearchParams({ status: "archived", page, per_page });
    if (search) params.set("search", search);

    const response = await fetch(
      `${BACKEND_BASE}/issues?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const { data } = await response.json();
    const disputes = (data.data || []).map(mapIssueToArchiveItem);

    return NextResponse.json({
      disputes,
      total: data.total,
      page: data.page,
      totalPages: data.total_pages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { disputes: [], total: 0, page: 1, totalPages: 0, error: error.message || "Failed to fetch archive" },
      { status: 502 }
    );
  }
}
