import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { issues, participants, users, submissions, evidence } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/middleware/auth";
import { handleApiError } from "@/lib/services/errors";
import { NotFoundError } from "@/lib/services/errors";

export async function GET(request: NextRequest, { params }: { params: Promise<{ issueId: string }> }) {
  try {
    await getCurrentUser(request);
    const { issueId } = await params;

    const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
    if (!issue) throw new NotFoundError("Issue");

    const participantRows = await db
      .select({
        id: participants.id,
        userId: participants.userId,
        role: participants.role,
        displayName: users.displayName,
      })
      .from(participants)
      .innerJoin(users, eq(participants.userId, users.id))
      .where(eq(participants.issueId, issueId));

    const submissionRows = await db
      .select({
        submissionType: submissions.submissionType,
        content: submissions.content,
        status: submissions.status,
        participantId: submissions.participantId,
        displayName: users.displayName,
      })
      .from(submissions)
      .innerJoin(participants, eq(submissions.participantId, participants.id))
      .innerJoin(users, eq(participants.userId, users.id))
      .where(eq(submissions.issueId, issueId));

    const evidenceRows = await db
      .select({
        description: evidence.description,
        fileType: evidence.fileType,
        fileSize: evidence.fileSize,
        participantId: evidence.participantId,
        displayName: users.displayName,
      })
      .from(evidence)
      .innerJoin(participants, eq(evidence.participantId, participants.id))
      .innerJoin(users, eq(participants.userId, users.id))
      .where(eq(evidence.issueId, issueId));

    const data = {
      issue: {
        issueNumber: issue.issueNumber,
        title: issue.title,
        description: issue.description,
        currentStatus: issue.currentStatus,
        createdAt: issue.createdAt,
      },
      participants: participantRows.map((p) => ({
        displayName: p.displayName,
        role: p.role,
      })),
      submissions: submissionRows.map((s) => ({
        submissionType: s.submissionType,
        content: s.content,
        status: s.status,
        participantDisplayName: s.displayName,
      })),
      evidence: evidenceRows.map((e) => ({
        description: e.description,
        fileType: e.fileType,
        fileSize: e.fileSize,
        participantDisplayName: e.displayName,
      })),
      generatedAt: new Date().toISOString(),
    };

    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}