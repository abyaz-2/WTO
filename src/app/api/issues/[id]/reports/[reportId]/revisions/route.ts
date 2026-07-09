import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  const mockRevisions = [
    {
      id: "rev-001",
      reportId,
      version: 1,
      changes: "Initial report generation.",
      editedBy: "AI_System",
      editedAt: "2026-07-08T10:00:00Z",
    },
    {
      id: "rev-002",
      reportId,
      version: 2,
      changes: "Applied fact-check corrections to executive summary.",
      editedBy: "user_editor_01",
      editedAt: "2026-07-08T11:30:00Z",
    },
    {
      id: "rev-003",
      reportId,
      version: 3,
      changes: "Updated key findings section with additional data.",
      editedBy: "user_editor_01",
      editedAt: "2026-07-08T14:00:00Z",
    },
  ];

  return NextResponse.json({ data: mockRevisions, error: null });
}