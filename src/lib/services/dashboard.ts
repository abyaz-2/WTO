import { db } from "@/lib/db";
import { issues, participants } from "@/lib/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";

const ACTIVE_STATUSES = [
  "draft", "submitted", "under_review", "approved", "published",
  "registration_open", "registration_closed", "submission_phase",
  "evidence_phase", "ai_processing", "eb_review", "fact_checking",
  "final_revision", "final_published",
];

export async function getDashboardStats(userId: string) {
  const statusCounts: Record<string, number> = {};
  for (const status of ACTIVE_STATUSES) {
    const [result] = await db
      .select({ count: count() })
      .from(issues)
      .where(eq(issues.currentStatus, status));
    statusCounts[status] = result?.count ?? 0;
  }

  const [myIssues] = await db
    .select({ count: count() })
    .from(issues)
    .where(eq(issues.complainantId, userId));
  const myIssueCount = myIssues?.count ?? 0;

  const reviewStatuses = ["eb_review", "fact_checking", "final_revision"];
  const [pendingReviews] = await db
    .select({ count: count() })
    .from(participants)
    .innerJoin(issues, eq(participants.issueId, issues.id))
    .where(and(
      eq(participants.userId, userId),
      eq(participants.status, "active"),
      inArray(issues.currentStatus, reviewStatuses),
    ));
  const pendingReviewCount = pendingReviews?.count ?? 0;

  return {
    statusCounts,
    myIssueCount,
    pendingReviewCount,
    totalIssues: Object.values(statusCounts).reduce((a, b) => a + b, 0),
  };
}
