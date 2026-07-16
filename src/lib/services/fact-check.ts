import { db } from "@/lib/db";
import { factChecks, aiReports, participants, issues } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError } from "./errors";

export async function submitFactCheck(aiReportId: string, participantId: string, data: { status?: string; comments?: Record<string, unknown>[] }, userId: string) {
  const [report] = await db.select().from(aiReports).where(eq(aiReports.id, aiReportId)).limit(1);
  if (!report) throw new NotFoundError("AI Report");

  const [issue] = await db.select().from(issues).where(eq(issues.id, report.issueId)).limit(1);
  if (issue && !["eb_review", "fact_checking"].includes(issue.currentStatus)) {
    throw new ForbiddenError("Report is not in review phase");
  }

  const [participant] = await db.select().from(participants).where(eq(participants.id, participantId)).limit(1);
  if (!participant || participant.userId !== userId) {
    throw new ForbiddenError("You are not this participant");
  }

  const [existing] = await db
    .select()
    .from(factChecks)
    .where(and(eq(factChecks.aiReportId, aiReportId), eq(factChecks.participantId, participantId)))
    .limit(1);
  if (existing) {
    throw new ConflictError("You have already submitted a fact check for this report");
  }

  const [factCheck] = await db
    .insert(factChecks)
    .values({
      aiReportId,
      participantId,
      status: data.status || "pending",
      comments: data.comments || [],
    })
    .returning();
  return factCheck;
}

export async function reviewFactCheck(factCheckId: string, data: { status: string; comments?: Record<string, unknown>[] }, userId: string) {
  const [fc] = await db.select().from(factChecks).where(eq(factChecks.id, factCheckId)).limit(1);
  if (!fc) throw new NotFoundError("Fact check");

  const updateData: Record<string, unknown> = { status: data.status, reviewedAt: new Date().toISOString() };
  if (data.comments) updateData.comments = data.comments;

  const [updated] = await db
    .update(factChecks)
    .set(updateData)
    .where(eq(factChecks.id, factCheckId))
    .returning();
  return updated;
}

export async function listFactChecks(aiReportId: string) {
  return db
    .select()
    .from(factChecks)
    .where(eq(factChecks.aiReportId, aiReportId));
}
