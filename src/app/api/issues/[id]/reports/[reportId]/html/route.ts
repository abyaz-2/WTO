import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  const mockHtml = `<html>
<body>
  <h1>Report: ${reportId}</h1>
  <h2>Issue: ${id}</h2>
  <div class="content">
    <p>This is a mock HTML version of the report for development purposes.</p>
  </div>
</body>
</html>`;

  return new NextResponse(mockHtml, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}