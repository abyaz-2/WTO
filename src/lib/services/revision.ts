import { db } from "@/lib/db";
import { revisions } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function createRevision(
  revisableType: string,
  revisableId: string,
  changes: Record<string, unknown>,
  createdBy?: string,
  reason?: string,
) {
  const result = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(version), 0) + 1` })
    .from(revisions)
    .where(and(
      eq(revisions.revisableType, revisableType),
      eq(revisions.revisableId, revisableId),
    ));
  const nextVersion = result[0]?.maxVersion ?? 1;

  const [revision] = await db
    .insert(revisions)
    .values({
      revisableType,
      revisableId,
      version: nextVersion,
      changes,
      createdBy,
      reason,
    })
    .returning();
  return revision;
}

export async function listRevisions(revisableType: string, revisableId: string) {
  return db
    .select()
    .from(revisions)
    .where(and(
      eq(revisions.revisableType, revisableType),
      eq(revisions.revisableId, revisableId),
    ))
    .orderBy(desc(revisions.version));
}

export async function getDiff(revisableType: string, revisableId: string, fromVersion: number, toVersion: number) {
  const [fromRev] = await db
    .select()
    .from(revisions)
    .where(and(
      eq(revisions.revisableType, revisableType),
      eq(revisions.revisableId, revisableId),
      eq(revisions.version, fromVersion),
    ))
    .limit(1);

  const [toRev] = await db
    .select()
    .from(revisions)
    .where(and(
      eq(revisions.revisableType, revisableType),
      eq(revisions.revisableId, revisableId),
      eq(revisions.version, toVersion),
    ))
    .limit(1);

  if (!fromRev || !toRev) throw new NotFoundError("Revision");

  return { fromChanges: fromRev.changes, toChanges: toRev.changes };
}
