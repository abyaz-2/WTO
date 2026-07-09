import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  return NextResponse.json({
    data: {
      reportId,
      issueId: id,
      status: "pending_review",
      isReviewed: false,
      isApproved: false,
      submittedAt: "2026-07-08T10:00:00Z",
    },
    error: null,
  });
}