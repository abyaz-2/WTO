import { db } from "@/lib/db";
import { submissions, issues, participants, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/services/errors";

export async function createSubmission(
  issueId: string,
  participantId: string,
  submissionType: string,
  content: Record<string, unknown>,
  userId: string,
) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  if (issue.currentStatus !== "submission_phase" && issue.currentStatus !== "evidence_phase") {
    throw new ValidationError("Issue is not in submission or evidence phase");
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.issueId, issueId)))
    .limit(1);
  if (!participant) throw new NotFoundError("Participant");

  if (participant.userId !== userId) {
    throw new ForbiddenError("Only the participant can create their own submission");
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      issueId,
      participantId,
      submissionType,
      content,
      status: "draft",
    })
    .returning();

  return submission;
}

export async function updateSubmission(
  issueId: string,
  submissionId: string,
  data: { content?: Record<string, unknown> },
  userId: string,
) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.issueId, issueId)))
    .limit(1);
  if (!submission) throw new NotFoundError("Submission");

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, submission.participantId))
    .limit(1);
  if (!participant || participant.userId !== userId) {
    throw new ForbiddenError("Only the owning participant can update this submission");
  }

  if (submission.status !== "draft") {
    throw new ValidationError("Only draft submissions can be updated");
  }

  const [updated] = await db
    .update(submissions)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(submissions.id, submissionId))
    .returning();

  return updated;
}

export async function submitSubmission(issueId: string, submissionId: string, userId: string) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.issueId, issueId)))
    .limit(1);
  if (!submission) throw new NotFoundError("Submission");

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, submission.participantId))
    .limit(1);
  if (!participant || participant.userId !== userId) {
    throw new ForbiddenError("Only the owning participant can submit this submission");
  }

  if (submission.status !== "draft") {
    throw new ValidationError("Submission must be in draft status to be submitted");
  }

  const now = new Date().toISOString();
  const [updated] = await db
    .update(submissions)
    .set({ status: "submitted", submittedAt: now, updatedAt: now })
    .where(eq(submissions.id, submissionId))
    .returning();

  return updated;
}

export async function listSubmissions(issueId: string, userId: string, userRole: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  if (userRole === "executive_board") {
    const result = await db
      .select({
        submission: submissions,
        participantDisplayName: users.displayName,
      })
      .from(submissions)
      .innerJoin(participants, eq(submissions.participantId, participants.id))
      .innerJoin(users, eq(participants.userId, users.id))
      .where(eq(submissions.issueId, issueId))
      .orderBy(submissions.createdAt);

    return result.map((r) => ({
      ...r.submission,
      participantDisplayName: r.participantDisplayName,
    }));
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.issueId, issueId), eq(participants.userId, userId)))
    .limit(1);

  if (!participant) return [];

  const result = await db
    .select({
      submission: submissions,
      participantDisplayName: users.displayName,
    })
    .from(submissions)
    .innerJoin(participants, eq(submissions.participantId, participants.id))
    .innerJoin(users, eq(participants.userId, users.id))
    .where(
      and(eq(submissions.issueId, issueId), eq(submissions.participantId, participant.id)),
    )
    .orderBy(submissions.createdAt);

  return result.map((r) => ({
    ...r.submission,
    participantDisplayName: r.participantDisplayName,
  }));
}
