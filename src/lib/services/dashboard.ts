import { db } from "@/lib/db";
import { issues, participants } from "@/lib/db/schema";
import { eq, and, ne, inArray, count } from "drizzle-orm";

export async function getDashboardStats(userId: string) {
  const [activeResult] = await db
    .select({ count: count() })
    .from(issues)
    .where(ne(issues.currentStatus, "archived"));
  const activeIssues = Number(activeResult?.count ?? 0);

  const [myResult] = await db
    .select({ count: count() })
    .from(issues)
    .where(eq(issues.complainantId, userId));
  const mySubmissions = Number(myResult?.count ?? 0);

  const reviewStatuses = ["eb_review", "fact_checking", "final_revision"];
  const [pendingResult] = await db
    .select({ count: count() })
    .from(participants)
    .innerJoin(issues, eq(participants.issueId, issues.id))
    .where(and(
      eq(participants.userId, userId),
      eq(participants.status, "active"),
      inArray(issues.currentStatus, reviewStatuses),
    ));
  const pendingReviews = Number(pendingResult?.count ?? 0);

  return {
    active_issues: activeIssues,
    my_submissions: mySubmissions,
    pending_reviews: pendingReviews,
  };
}
