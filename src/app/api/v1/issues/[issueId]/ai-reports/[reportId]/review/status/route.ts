import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { aiReports, factChecks, participants, users, issues } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError, apiResponse } from "@/lib/services/errors";
import { NotFoundError } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string; reportId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId, reportId } = await params;

    const [report] = await db.select().from(aiReports).where(eq(aiReports.id, reportId)).limit(1);
    if (!report) throw new NotFoundError("AI Report");

    const issueParticipants = await db
      .select({
        id: participants.id,
        userId: participants.userId,
        role: participants.role,
        status: participants.status,
        displayName: users.displayName,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .where(and(eq(participants.issueId, issueId), eq(participants.status, "active")));

    const reportFactChecks = await db
      .select()
      .from(factChecks)
      .where(eq(factChecks.aiReportId, reportId));

    const reviewStatus = issueParticipants.map((p) => {
      const fc = reportFactChecks.find((f) => f.participantId === p.id);
      return {
        participantId: p.id,
        userId: p.userId,
        displayName: p.displayName,
        role: p.role,
        factCheckId: fc?.id ?? null,
        factCheckStatus: fc?.status ?? "not_submitted",
        comments: fc?.comments ?? [],
        reviewedAt: fc?.reviewedAt ?? null,
      };
    });

    return Response.json(apiResponse({ report, reviewStatus }));
  } catch (error) {
    return handleApiError(error);
  }
}
