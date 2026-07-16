import { db } from "@/lib/db";
import { issues, participants, revisions } from "@/lib/db/schema";
import { eq, and, ilike, count, desc } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/services/errors";
import crypto from "crypto";

export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "rejected"],
  under_review: ["approved", "rejected", "draft"],
  approved: ["published"],
  published: ["registration_open"],
  registration_open: ["registration_closed"],
  registration_closed: ["submission_phase"],
  submission_phase: ["evidence_phase"],
  evidence_phase: ["ai_processing"],
  ai_processing: ["eb_review"],
  eb_review: ["fact_checking", "draft"],
  fact_checking: ["final_revision", "eb_review"],
  final_revision: ["final_published"],
  final_published: ["archived"],
  rejected: ["draft"],
};

const TRANSITION_PERMISSIONS: Record<string, string> = {
  submitted: "complainant",
  under_review: "eb",
  approved: "eb",
  published: "eb",
  registration_open: "eb",
  registration_closed: "eb",
  submission_phase: "eb",
  evidence_phase: "eb",
  ai_processing: "system",
  eb_review: "eb",
  fact_checking: "eb",
  final_revision: "eb",
  final_published: "eb",
  rejected: "eb",
  archived: "eb",
};

export async function createIssue(data: { title: string; description?: string; respondentId?: string }, userId: string) {
  const [countResult] = await db.select({ value: count() }).from(issues);
  const nextNumber = Number(countResult.value) + 1;
  const issueNumber = `WTO-${String(nextNumber).padStart(4, "0")}`;

  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: "Issue created",
    description: "Issue has been created in draft status",
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const [issue] = await db
    .insert(issues)
    .values({
      issueNumber,
      title: data.title,
      description: data.description,
      complainantId: userId,
      currentStatus: "draft",
      timeline: [timelineEntry],
    })
    .returning();

  await db.insert(participants).values({
    issueId: issue.id,
    userId,
    role: "complainant",
    status: "active",
    joinedAt: new Date().toISOString(),
  });

  if (data.respondentId) {
    await db.insert(participants).values({
      issueId: issue.id,
      userId: data.respondentId,
      role: "respondent",
      status: "active",
      joinedAt: new Date().toISOString(),
    });
  }

  return issue;
}

export async function getIssue(issueId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");
  return issue;
}

export async function listIssues(
  page: number = 1,
  perPage: number = 20,
  options?: { status?: string; search?: string; userId?: string },
) {
  const conditions: (ReturnType<typeof eq> | ReturnType<typeof ilike>)[] = [];

  if (options?.status) {
    conditions.push(eq(issues.currentStatus, options.status));
  }

  if (options?.userId) {
    conditions.push(eq(issues.complainantId, options.userId));
  }

  if (options?.search) {
    conditions.push(ilike(issues.title, `%${options.search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const offset = (page - 1) * perPage;

  const [totalResult] = await db
    .select({ value: count() })
    .from(issues)
    .where(whereClause);

  const total = Number(totalResult.value);

  const data = await db
    .select()
    .from(issues)
    .where(whereClause)
    .orderBy(desc(issues.createdAt))
    .limit(perPage)
    .offset(offset);

  return {
    data,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function updateIssue(
  issueId: string,
  data: { title?: string; description?: string },
  userId: string,
) {
  const issue = await getIssue(issueId);

  if (issue.complainantId !== userId) {
    throw new ForbiddenError("Only the complainant can update this issue");
  }

  if (issue.currentStatus !== "draft") {
    throw new ValidationError("Issue can only be updated in draft status");
  }

  const changes: Record<string, { old: string; new: string }> = {};

  if (data.title !== undefined && data.title !== issue.title) {
    changes.title = { old: issue.title, new: data.title };
  }

  if (data.description !== undefined && data.description !== (issue.description ?? "")) {
    changes.description = { old: issue.description ?? "", new: data.description };
  }

  if (Object.keys(changes).length > 0) {
    const [latestRevision] = await db
      .select({ version: revisions.version })
      .from(revisions)
      .where(
        and(eq(revisions.revisableType, "issue"), eq(revisions.revisableId, issueId)),
      )
      .orderBy(desc(revisions.version))
      .limit(1);

    const nextVersion = (latestRevision?.version ?? 0) + 1;

    await db.insert(revisions).values({
      revisableType: "issue",
      revisableId: issueId,
      version: nextVersion,
      changes,
      createdBy: userId,
    });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;

  const [updated] = await db
    .update(issues)
    .set(updateData)
    .where(eq(issues.id, issueId))
    .returning();

  return updated;
}

export async function transitionStatus(
  issueId: string,
  targetStatus: string,
  userId: string,
  userRole: string,
) {
  const issue = await getIssue(issueId);
  const currentStatus = issue.currentStatus;

  const allowedTransitions = VALID_TRANSITIONS[currentStatus];
  if (!allowedTransitions || !allowedTransitions.includes(targetStatus)) {
    throw new ValidationError(
      `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
    );
  }

  const requiredRole = TRANSITION_PERMISSIONS[targetStatus];
  if (!requiredRole) {
    throw new ValidationError(`No permission mapping for target status '${targetStatus}'`);
  }

  if (requiredRole === "complainant") {
    if (issue.complainantId !== userId) {
      throw new ForbiddenError("Only the complainant can perform this transition");
    }
  } else if (requiredRole === "eb") {
    if (userRole !== "executive_board") {
      throw new ForbiddenError("Only executive board members can perform this transition");
    }
  } else if (requiredRole === "system") {
    throw new ForbiddenError("This transition can only be performed by the system");
  }

  const currentTimeline = (issue.timeline as Array<Record<string, unknown>>) ?? [];
  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: `Status changed from ${currentStatus} to ${targetStatus}`,
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const [updated] = await db
    .update(issues)
    .set({
      currentStatus: targetStatus,
      timeline: [...currentTimeline, timelineEntry],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(issues.id, issueId))
    .returning();

  return updated;
}

export async function archiveIssue(issueId: string, userId: string) {
  const issue = await getIssue(issueId);

  if (issue.currentStatus === "archived") {
    throw new ValidationError("Issue is already archived");
  }

  const currentTimeline = (issue.timeline as Array<Record<string, unknown>>) ?? [];
  const timelineEntry = {
    id: crypto.randomUUID(),
    type: "status_change",
    title: "Issue archived",
    actor_name: userId,
    created_at: new Date().toISOString(),
  };

  const [updated] = await db
    .update(issues)
    .set({
      currentStatus: "archived",
      timeline: [...currentTimeline, timelineEntry],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(issues.id, issueId))
    .returning();

  return updated;
}
