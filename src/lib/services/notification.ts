import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, isNull, desc, count } from "drizzle-orm";
import { NotFoundError } from "./errors";

export async function createNotification(userId: string, type: string, content: Record<string, unknown>) {
  const [notification] = await db
    .insert(notifications)
    .values({ userId, type, content })
    .returning();
  return notification;
}

export async function markRead(notificationId: string, userId: string) {
  const [notification] = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, notificationId))
    .limit(1);

  if (!notification) throw new NotFoundError("Notification");
  if (notification.userId !== userId) throw new NotFoundError("Notification");

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(eq(notifications.id, notificationId))
    .returning();
  return updated;
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { success: true };
}

export async function listNotifications(userId: string, page: number = 1, perPage: number = 20, unreadOnly?: boolean) {
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  const whereClause = and(...conditions);

  const totalResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(whereClause);
  const total = totalResult[0]?.count ?? 0;

  const data = await db
    .select()
    .from(notifications)
    .where(whereClause)
    .orderBy(desc(notifications.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage);

  const unreadResult = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  const unreadCount = unreadResult[0]?.count ?? 0;

  return {
    data,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
    unreadCount,
  };
}
