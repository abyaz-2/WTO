import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  const body = await request.json();

  const mockComment = {
    id: "comment-" + Date.now(),
    reportId,
    issueId: id,
    author: body.author || "anonymous",
    content: body.content || "",
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ data: mockComment, error: null });
}