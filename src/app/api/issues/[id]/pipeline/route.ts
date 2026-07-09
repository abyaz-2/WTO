import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const mockStages = [
    {
      id: "stage-001",
      name: "Data Collection",
      status: "completed",
      progress: 100,
      startedAt: "2026-07-01T09:00:00Z",
      completedAt: "2026-07-02T17:00:00Z",
    },
    {
      id: "stage-002",
      name: "AI Analysis",
      status: "completed",
      progress: 100,
      startedAt: "2026-07-02T17:00:00Z",
      completedAt: "2026-07-03T12:00:00Z",
    },
    {
      id: "stage-003",
      name: "Report Generation",
      status: "in_progress",
      progress: 65,
      startedAt: "2026-07-03T12:00:00Z",
      completedAt: null,
    },
    {
      id: "stage-004",
      name: "Fact Checking",
      status: "pending",
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
    {
      id: "stage-005",
      name: "Review",
      status: "pending",
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
    {
      id: "stage-006",
      name: "Publication",
      status: "pending",
      progress: 0,
      startedAt: null,
      completedAt: null,
    },
  ];

  return NextResponse.json({
    data: {
      issueId: id,
      stages: mockStages,
    },
    error: null,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  return NextResponse.json({
    data: {
      issueId: id,
      retryStage: body.stageId || null,
      status: "retry_initiated",
      message: "Retry initiated for issue " + id + ".",
    },
    error: null,
  });
}