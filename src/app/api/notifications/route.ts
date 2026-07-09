import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const mockNotifications = [
    {
      id: "notif-001",
      type: "report_generated",
      title: "Report Generated",
      message: "AI report for Issue #123 has been generated successfully.",
      issueId: "123",
      read: false,
      createdAt: "2026-07-08T10:30:00Z",
    },
    {
      id: "notif-002",
      type: "fact_check_completed",
      title: "Fact Check Completed",
      message: "Fact check for report on Issue #456 has been completed.",
      issueId: "456",
      read: false,
      createdAt: "2026-07-08T09:15:00Z",
    },
    {
      id: "notif-003",
      type: "review_requested",
      title: "Review Requested",
      message: "A review has been requested for the report on Issue #789.",
      issueId: "789",
      read: true,
      createdAt: "2026-07-07T14:00:00Z",
    },
  ];

  return NextResponse.json({ data: mockNotifications, error: null });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    data: {
      id: "notif-new",
      ...body,
      createdAt: new Date().toISOString(),
    },
    error: null,
  });
}
