import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  try {
    const response = await fetch(
      `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/review/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const backendData = await response.json();
    return NextResponse.json(backendData.data);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to approve report" },
      { status: 502 }
    );
  }
}
