import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_BASE}/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const { data } = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to mark notifications as read" },
      { status: 502 }
    );
  }
}
