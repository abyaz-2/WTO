import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  return NextResponse.json({
    data: {
      reportId,
      issueId: id,
      message: "PDF generation is not available in the dev environment.",
      pdfAvailable: false,
    },
    error: null,
  });
}