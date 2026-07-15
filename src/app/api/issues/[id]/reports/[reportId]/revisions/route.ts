import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  try {
    const response = await fetch(
      `${BACKEND_BASE}/revisions/ai_report/${reportId}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const backendData = await response.json();
    const revisions = (backendData.data || []).map((rev: any) => {
      const changes =
        typeof rev.changes === "string"
          ? JSON.parse(rev.changes)
          : rev.changes || {};
      return {
        id: rev.id,
        revision_number: rev.revision_number,
        original_text: changes.original_text || "",
        revised_text: changes.revised_text || "",
        party: rev.created_by || "",
        section_id: changes.section_id || "",
        status: "pending",
        created_at: rev.created_at,
      };
    });

    const sections = [...new Set(revisions.map((r: any) => r.section_id).filter(Boolean))];
    const parties = [...new Set(revisions.map((r: any) => r.party).filter(Boolean))];

    return NextResponse.json({ revisions, sections, parties });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to fetch revisions" },
      { status: 502 }
    );
  }
}