import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string; sectionId: string }> }
) {
  const { id, reportId, sectionId } = await params;
  const body = await request.json();

  return NextResponse.json({
    data: {
      reportId,
      sectionId,
      issueId: id,
      content: body.content || "",
      savedAt: new Date().toISOString(),
      status: "saved",
    },
    error: null,
  });
}