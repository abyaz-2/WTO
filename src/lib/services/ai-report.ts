import { db } from "@/lib/db";
import { aiReports, issues } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError } from "./errors";

const VALID_AI_REPORT_TRANSITIONS: Record<string, string[]> = {
  generating: ["draft"],
  draft: ["eb_review"],
  eb_review: ["fact_checking"],
  fact_checking: ["finalizing"],
  finalizing: ["published"],
  published: ["archived"],
};

export async function generateReport(issueId: string, userId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  if (!["ai_processing", "eb_review"].includes(issue.currentStatus)) {
    throw new ValidationError("Issue must be in ai_processing or eb_review status");
  }

  const [activeReport] = await db
    .select()
    .from(aiReports)
    .where(and(eq(aiReports.issueId, issueId), eq(aiReports.status, "generating")))
    .limit(1);
  if (activeReport) {
    throw new ConflictError("A report is already being generated for this issue");
  }

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
      status: "generating",
      generatedBy: userId,
      content: {},
      metadata: {},
    })
    .returning();

  return report;
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

const PIPELINE_STAGES = [
  "collect", "normalize", "extract_facts", "retrieve_law",
  "analyze_claims", "draft_intro", "draft_factual",
  "draft_analysis", "draft_findings", "draft_recommendations",
];

export async function getPipelineStatus(issueId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  const stages = PIPELINE_STAGES.map((stage, index) => {
    let status = "pending";
    if (["fact_checking", "final_revision", "final_published", "archived"].includes(issue.currentStatus)) {
      status = "completed";
    } else if (issue.currentStatus === "eb_review") {
      status = "completed";
    } else if (issue.currentStatus === "ai_processing") {
      if (index === 0) status = "completed";
      else status = "running";
    }
    return { stage, status, progress: status === "completed" ? 100 : status === "running" ? 45 : 0 };
  });

  return {
    stages,
    progress: Math.round(stages.reduce((sum, s) => sum + (s.status === "completed" ? 10 : s.status === "running" ? 4.5 : 0), 0)),
    tokenUsage: 0,
    costEstimate: 0,
    estimatedTimeRemaining: 0,
  };
}
