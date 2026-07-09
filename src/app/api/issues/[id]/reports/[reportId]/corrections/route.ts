import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  const mockCorrections = [
    {
      id: "corr-001",
      reportId,
      field: "executive_summary",
      originalText: "The original summary text with potential error.",
      suggestedText: "The corrected summary text.",
      status: "pending",
      createdBy: "AI_FactCheck",
      createdAt: "2026-07-08T10:00:00Z",
    },
    {
      id: "corr-002",
      reportId,
      field: "key_findings",
      originalText: "Original finding that needs verification.",
      suggestedText: "Verified finding with accurate citation.",
      status: "accepted",
      createdBy: "AI_FactCheck",
      createdAt: "2026-07-07T14:30:00Z",
    },
  ];

  return NextResponse.json({ data: mockCorrections, error: null });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  const body = await request.json();

  try {
    const response = await fetch(
      `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/fact-checks`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to update correction" },
      { status: 502 }
    );
  }
}