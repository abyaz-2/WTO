import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { factChecks, participants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError, apiResponse } from "@/lib/services/errors";
import { NotFoundError, ForbiddenError } from "@/lib/services/errors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ issueId: string; reportId: string }> }) {
  try {
    const auth = await getCurrentUser(request);
    const { issueId, reportId } = await params;

    const [participant] = await db
      .select()
      .from(participants)
      .where(and(eq(participants.issueId, issueId), eq(participants.userId, auth.id), eq(participants.status, "active")))
      .limit(1);
    if (!participant) throw new NotFoundError("Active participant record");

    const [existing] = await db
      .select()
      .from(factChecks)
      .where(and(eq(factChecks.aiReportId, reportId), eq(factChecks.participantId, participant.id)))
      .limit(1);
    if (existing) {
      const [updated] = await db
        .update(factChecks)
        .set({ status: "approved", reviewedAt: new Date().toISOString() })
        .where(eq(factChecks.id, existing.id))
        .returning();
      return Response.json(apiResponse(updated));
    }

    const [factCheck] = await db
      .insert(factChecks)
      .values({
        aiReportId: reportId,
        participantId: participant.id,
        status: "approved",
        comments: [],
      })
      .returning();

    return Response.json(apiResponse(factCheck), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
