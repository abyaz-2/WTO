import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  return NextResponse.json({
    data: {
      approved: true,
      message: `Report ${reportId} for issue ${id} has been approved`,
      approvedAt: new Date().toISOString(),
    },
    error: null,
  });
}
