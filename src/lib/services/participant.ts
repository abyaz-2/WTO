import { db } from "@/lib/db";
import { issues, participants, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "@/lib/services/errors";

export async function registerParticipant(
  issueId: string,
  userId: string,
  role: string,
  actorRole: string,
) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  if (actorRole !== "executive_board") {
    throw new ForbiddenError("Only executive board members can register participants");
  }

  if (!["draft", "registration_open"].includes(issue.currentStatus)) {
    throw new ValidationError("Issue must be in draft or registration_open status");
  }

  const [existingActive] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.issueId, issueId),
        eq(participants.userId, userId),
        eq(participants.status, "active"),
      ),
    )
    .limit(1);

  if (existingActive) {
    throw new ConflictError("User is already an active participant in this issue");
  }

  const [existingRemoved] = await db
    .select()
    .from(participants)
    .where(
      and(
        eq(participants.issueId, issueId),
        eq(participants.userId, userId),
        eq(participants.status, "removed"),
      ),
    )
    .limit(1);

  if (existingRemoved) {
    const [updated] = await db
      .update(participants)
      .set({ status: "active", role, updatedAt: new Date().toISOString() })
      .where(eq(participants.id, existingRemoved.id))
      .returning();
    return updated;
  }

  const [participant] = await db
    .insert(participants)
    .values({
      issueId,
      userId,
      role,
      status: "active",
      joinedAt: new Date().toISOString(),
    })
    .returning();

  return participant;
}

export async function removeParticipant(issueId: string, participantId: string, actorRole: string) {
  if (actorRole !== "executive_board") {
    throw new ForbiddenError("Only executive board members can remove participants");
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.issueId, issueId)))
    .limit(1);

  if (!participant) throw new NotFoundError("Participant");

  const [updated] = await db
    .update(participants)
    .set({ status: "removed", updatedAt: new Date().toISOString() })
    .where(eq(participants.id, participantId))
    .returning();

  return updated;
}

export async function changeRole(
  issueId: string,
  participantId: string,
  newRole: string,
  actorRole: string,
) {
  if (actorRole !== "executive_board") {
    throw new ForbiddenError("Only executive board members can change participant roles");
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.id, participantId), eq(participants.issueId, issueId)))
    .limit(1);

  if (!participant) throw new NotFoundError("Participant");

  const [updated] = await db
    .update(participants)
    .set({ role: newRole, updatedAt: new Date().toISOString() })
    .where(eq(participants.id, participantId))
    .returning();

  return updated;
}

export async function listParticipants(issueId: string) {
  const [issue] = await db.select().from(issues).where(eq(issues.id, issueId)).limit(1);
  if (!issue) throw new NotFoundError("Issue");

  return db
    .select({
      id: participants.id,
      issueId: participants.issueId,
      userId: participants.userId,
      role: participants.role,
      status: participants.status,
      joinedAt: participants.joinedAt,
      metadata: participants.metadata,
      displayName: users.displayName,
      email: users.email,
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .where(eq(participants.issueId, issueId));
}
