import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  const mockPublishedReport = {
    id: reportId,
    issueId: id,
    title: "Published AI Report",
    status: "published",
    publishedAt: "2026-07-08T12:00:00Z",
    publishedBy: "publisher_01",
    content: {
      executive_summary: "This is the published executive summary.",
      key_findings: [
        "Finding 1: Significant data trend identified.",
        "Finding 2: Key metric shows improvement.",
      ],
      methodology: "AI-assisted analysis with human verification.",
    },
    pdfUrl: "/api/issues/" + id + "/reports/" + reportId + "/pdf",
    htmlUrl: "/api/issues/" + id + "/reports/" + reportId + "/html",
  };

  return NextResponse.json({ data: mockPublishedReport, error: null });
}