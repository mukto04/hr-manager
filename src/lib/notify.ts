/**
 * Notification Helper
 * Call createNotification() from any API route to send a notification to an employee.
 */

import { getTenantDb, newId, now } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";

export type NotificationType =
  | "SALARY"
  | "LEAVE"
  | "ATTENDANCE"
  | "LOAN"
  | "BREAK"
  | "PROFILE"
  | "PROJECT"
  | "SYSTEM";

interface NotifyOptions {
  employeeId?: string;
  title: string;
  message: string;
  type?: NotificationType;
}

export async function createNotification({
  employeeId,
  title,
  message,
  type = "SYSTEM",
}: NotifyOptions): Promise<void> {
  try {
    const db = await getTenantDb();

    // Auto-cleanup: Delete notifications older than 7 days for this employee (or HR)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    if (employeeId) {
      await db
        .delete(notifications)
        .where(
          and(eq(notifications.employeeId, employeeId), lt(notifications.createdAt, sevenDaysAgoStr))
        );
    } else {
      await db
        .delete(notifications)
        .where(and(isNull(notifications.employeeId), lt(notifications.createdAt, sevenDaysAgoStr)));
    }

    await db.insert(notifications).values({
      id: newId(),
      employeeId: employeeId ?? null,
      title,
      message,
      type,
      createdAt: now(),
      updatedAt: now()
    });
  } catch (err) {
    // Never crash the main request due to a notification error
    console.error("[notify] Failed to create notification:", err);
  }
}
