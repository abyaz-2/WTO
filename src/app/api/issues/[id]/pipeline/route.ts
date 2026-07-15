import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const response = await fetch(`${BACKEND_BASE}/issues/${id}/pipeline`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const { data } = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      {
        stages: {},
        progress: 0,
        token_usage: 0,
        cost_estimate: 0,
        estimated_time_remaining: 0,
        error: error.message || "Failed to fetch pipeline",
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return NextResponse.json({
    issueId: id,
    status: "retry_initiated",
    message: "Retry initiated for issue " + id + ".",
    error: null,
  });
}
