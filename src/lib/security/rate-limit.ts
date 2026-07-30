import crypto from "crypto";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents } from "@/lib/db/schema";
import { ValidationError } from "@/lib/services/errors";

/** Database-backed rate limiter: works across server instances without retaining raw IP addresses. */
export async function enforceRateLimit(action: string, subject: string, limit: number, windowSeconds: number) {
  const keyHash = crypto.createHash("sha256").update(subject).digest("hex");
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${action}:${keyHash}`}))`);
    const [event] = await tx.insert(rateLimitEvents).values({ action, keyHash }).returning({ id: rateLimitEvents.id });
    const [{ value }] = await tx.select({ value: count() }).from(rateLimitEvents).where(and(eq(rateLimitEvents.action, action), eq(rateLimitEvents.keyHash, keyHash), gt(rateLimitEvents.createdAt, since)));
    if (Number(value) > limit) {
      if (event) await tx.delete(rateLimitEvents).where(eq(rateLimitEvents.id, event.id));
      throw new ValidationError("Too many requests. Please wait and try again.");
    }
    await tx.delete(rateLimitEvents).where(sql`${rateLimitEvents.createdAt} < now() - interval '2 days'`);
  });
}
