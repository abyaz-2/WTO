import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const per_page = searchParams.get("per_page") || "20";
  const unread = searchParams.get("unread") || "";

  try {
    const params = new URLSearchParams({ page, per_page });
    if (unread) params.set("unread", unread);

    const response = await fetch(
      `${BACKEND_BASE}/notifications?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const { data } = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { notifications: [], total: 0, unreadCount: 0, page: 1, totalPages: 0, error: error.message || "Failed to fetch notifications" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, error: null });
}
