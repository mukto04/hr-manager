/**
 * Notification Helper
 * Call createNotification() from any API route to send a notification to an employee.
 */




import { getTenantPrisma } from "@/lib/prisma";

export type NotificationType =
  | "SALARY"
  | "LEAVE"
  | "ATTENDANCE"
  | "LOAN"
  | "BREAK"
  | "PROFILE"
  | "PROJECT"
  | "SYSTEM"
;

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
    const prisma = await getTenantPrisma();
    
    // Auto-cleanup: Delete notifications older than 7 days for this employee (or HR)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await prisma.notification.deleteMany({
      where: {
        employeeId: employeeId || null,
        createdAt: { lt: sevenDaysAgo }
      }
    });

    await prisma.notification.create({
      data: { employeeId: employeeId || null, title, message, type },
    });
  } catch (err) {
    // Never crash the main request due to a notification error
    console.error("[notify] Failed to create notification:", err);
  }
}
