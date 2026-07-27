import { db } from "@/lib/db";
import { aiReports, issues } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotFoundError, ValidationError, ForbiddenError } from "./errors";

export async function createReport(issueId: string, userId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  const versionResult = await db
    .select({ maxVer: sql<number>`COALESCE(MAX(version), 0) + 1` })
    .from(aiReports)
    .where(eq(aiReports.issueId, issueId));
  const nextVersion = versionResult[0]?.maxVer ?? 1;

  const [report] = await db
    .insert(aiReports)
    .values({
      issueId,
      version: nextVersion,
      status: "draft",
      generatedBy: userId,
      content: {},
      metadata: {},
    })
    .returning();

  return report;
}

export async function importReportContent(issueId: string, reportId: string, content: Record<string, unknown>, userId: string) {
  const [report] = await db.select().from(aiReports).where(eq(aiReports.id, reportId)).limit(1);
  if (!report) throw new NotFoundError("AI Report");

  if (report.issueId !== issueId) throw new ValidationError("Report does not belong to this issue");

  const [updated] = await db
    .update(aiReports)
    .set({
      content,
      status: "review",
      metadata: { importedAt: new Date().toISOString(), importedBy: userId },
    })
    .where(eq(aiReports.id, reportId))
    .returning();
  return updated;
}

export async function getReport(reportId: string) {
  const [report] = await db.select().from(aiReports).where(eq(aiReports.id, reportId)).limit(1);
  if (!report) throw new NotFoundError("AI Report");
  return report;
}

export async function listReports(issueId: string) {
  return db
    .select()
    .from(aiReports)
    .where(eq(aiReports.issueId, issueId))
    .orderBy(desc(aiReports.version));
}

export async function updateReportStatus(reportId: string, status: string, content?: Record<string, unknown>) {
  const [report] = await db.select().from(aiReports).where(eq(aiReports.id, reportId)).limit(1);
  if (!report) throw new NotFoundError("AI Report");

  const updateData: Record<string, unknown> = { status };
  if (content) updateData.content = content;

  const [updated] = await db
    .update(aiReports)
    .set(updateData)
    .where(eq(aiReports.id, reportId))
    .returning();
  return updated;
}

export async function publishReport(reportId: string) {
  const [report] = await db.select().from(aiReports).where(eq(aiReports.id, reportId)).limit(1);
  if (!report) throw new NotFoundError("AI Report");

  const [updated] = await db
    .update(aiReports)
    .set({ status: "published" })
    .where(eq(aiReports.id, reportId))
    .returning();
  return updated;
}