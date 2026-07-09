import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  const mockReviewStatus = {
    reportId,
    issueId: id,
    status: "pending_review",
    assignedReviewer: "reviewer_01",
    reviewNotes: null,
    submittedAt: "2026-07-08T10:00:00Z",
    reviewedAt: null,
  };

  return NextResponse.json({ data: mockReviewStatus, error: null });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  const body = await request.json();

  return NextResponse.json({
    data: {
      reportId,
      issueId: id,
      status: "approved",
      reviewNotes: body.notes || null,
      reviewedAt: new Date().toISOString(),
    },
    error: null,
  });
}