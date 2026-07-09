import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "20", 10);
  const status = searchParams.get("status") || null;

  const mockArchivedIssues = [
    {
      id: "arc-001",
      title: "Archive Issue One",
      status: status || "archived",
      archivedAt: "2026-06-15T08:00:00Z",
      summary: "This is a mock archived issue.",
    },
    {
      id: "arc-002",
      title: "Archive Issue Two",
      status: status || "archived",
      archivedAt: "2026-06-10T12:30:00Z",
      summary: "Another mock archived issue.",
    },
    {
      id: "arc-003",
      title: "Archive Issue Three",
      status: status || "completed",
      archivedAt: "2026-05-28T16:45:00Z",
      summary: "A completed and archived issue.",
    },
  ];

  return NextResponse.json({
    data: {
      items: mockArchivedIssues,
      total: mockArchivedIssues.length,
      page,
      perPage,
      totalPages: Math.ceil(mockArchivedIssues.length / perPage),
    },
    error: null,
  });
}
