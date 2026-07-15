import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      reportId: string;
      correctionId: string;
    }>;
  }
) {
  const { id, reportId, correctionId } = await params;
  const body = await request.json();
  const { action, eb_note } = body;

  const backendStatus = action === "accepted" ? "approved" : "correction_requested";
  const comments: any[] = [];
  if (eb_note) {
    comments.push({ eb_note });
  }

  try {
    const response = await fetch(
      `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/fact-checks/${correctionId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus, comments }),
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
