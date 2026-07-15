import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = "http://localhost:8000/api/v1";

const STATUS_MAP: Record<string, string> = {
  approved: "accepted",
  correction_requested: "pending",
  pending: "pending",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;

  try {
    const [factChecksRes, participantsRes] = await Promise.all([
      fetch(
        `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/fact-checks`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      ),
      fetch(`${BACKEND_BASE}/issues/${id}/participants`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
    ]);

    if (!factChecksRes.ok) {
      throw new Error(`Backend responded with ${factChecksRes.status}`);
    }

    const factChecksData = await factChecksRes.json();
    const factChecks = factChecksData.data || [];

    const participantMap: Record<string, string> = {};
    if (participantsRes.ok) {
      const participantsData = await participantsRes.json();
      const participants = participantsData.data || [];
      for (const p of participants) {
        participantMap[p.id] = p.role || p.party || "";
      }
    }

    const corrections = factChecks.map((fc: any) => {
      const comment = (fc.comments && fc.comments[0]) || {};
      return {
        id: fc.id,
        report_id: fc.ai_report_id || reportId,
        section_id: comment.section_id || "",
        paragraph_index: comment.paragraph_index ?? 0,
        original_text: comment.original_text || "",
        proposed_text: comment.proposed_text || "",
        justification: comment.justification || "",
        submitted_by: fc.participant_id || "",
        party: participantMap[fc.participant_id] || "",
        status: STATUS_MAP[fc.status] || "pending",
        eb_note: comment.eb_note || "",
        created_at: fc.created_at,
        resolved_at: fc.reviewed_at || null,
      };
    });

    const parties = [
      ...new Set(corrections.map((c: any) => c.party).filter(Boolean)),
    ];

    return NextResponse.json({ corrections, parties });
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to fetch corrections" },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  const body = await request.json();

  try {
    const response = await fetch(
      `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/fact-checks`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to update correction" },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const { id, reportId } = await params;
  const body = await request.json();
  const { action, eb_note } = body;

  const backendStatus = action === "accepted" ? "approved" : "correction_requested";
  const comments: any[] = [];
  if (eb_note) {
    comments.push({ eb_note });
  }

  try {
    const response = await fetch(
      `${BACKEND_BASE}/issues/${id}/ai-reports/${reportId}/fact-checks`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus, comments }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { data: null, error: error.message || "Failed to update correction" },
      { status: 502 }
    );
  }
}