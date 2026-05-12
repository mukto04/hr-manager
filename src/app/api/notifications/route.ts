export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, getDb, newId, now } from "@/lib/db";
import { notifications, notes, tenants } from "@/lib/db/schema";
import { eq, and, lt, lte, isNull, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isHrAdmin = !!cookieStore.get("hr_auth_token")?.value;

    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get("admin") === "true";

    // If it's explicitly an admin request, check HR token
    if (isAdminRequest && !isHrAdmin) {
      return NextResponse.json({ message: "Unauthorized Admin" }, { status: 401 });
    }

    // If it's an employee request, check employee session
    if (!isAdminRequest && !employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const targetEmployeeId = isAdminRequest ? null : employeeId;

    const db = await getTenantDb();

    // 1. Check for due Note Reminders and convert to Notifications
    const nowDate = new Date();
    const nowStr = nowDate.toISOString();

    const dueNotes = await db
      .select()
      .from(notes)
      .where(and(lte(notes.reminderAt, nowStr), eq(notes.isReminderNotified, false)));

    if (dueNotes.length > 0) {
      console.log(`[Notifications API] Found ${dueNotes.length} due notes.`);
      for (const note of dueNotes) {
        try {
          await db.insert(notifications).values({
            id: newId(),
            employeeId: null, // HR level notification
            title: "Note Reminder",
            message: note.title
              ? `Reminder: ${note.title}`
              : `Reminder: ${note.content.replace(/<[^>]*>?/gm, "").substring(0, 50)}...`,
            type: "REMINDER",
            createdAt: now(),
            updatedAt: now()
          });
          await db
            .update(notes)
            .set({ isReminderNotified: true, updatedAt: now() })
            .where(eq(notes.id, note.id));
          console.log(`[Notifications API] Created reminder for note: ${note.id}`);
        } catch (err) {
          console.error(`[Notifications API] Failed to create notification for note ${note.id}:`, err);
        }
      }
    }

    // Auto-cleanup: Delete notifications older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    if (targetEmployeeId === null) {
      await db
        .delete(notifications)
        .where(and(isNull(notifications.employeeId), lt(notifications.createdAt, sevenDaysAgoStr)));
    } else {
      await db
        .delete(notifications)
        .where(
          and(eq(notifications.employeeId, targetEmployeeId), lt(notifications.createdAt, sevenDaysAgoStr))
        );
    }

    const notificationList = targetEmployeeId === null
      ? await db
          .select()
          .from(notifications)
          .where(isNull(notifications.employeeId))
          .orderBy(desc(notifications.createdAt))
          .limit(50)
      : await db
          .select()
          .from(notifications)
          .where(eq(notifications.employeeId, targetEmployeeId))
          .orderBy(desc(notifications.createdAt))
          .limit(50);

    // --- Subscription & Admin Info Fetch ---
    let subscription = null;
    try {
      const { cookies: getCookies } = await import("next/headers");
      const { jwtVerify } = await import("jose");

      const cStore = await getCookies();
      const token = cStore.get("hr_auth_token")?.value;

      if (token) {
        const secret = new TextEncoder().encode(
          process.env.SESSION_SECRET || "appdevs-hr-portal-secure-vault-998877"
        );
        const { payload } = await jwtVerify(token, secret);
        const slug = payload.slug as string;

        if (slug) {
          const tenant = await getDb()
            .select({
              subscriptionEnd: tenants.subscriptionEnd,
              adminUsername: tenants.adminUsername,
              adminPassword: tenants.adminPassword
            })
            .from(tenants)
            .where(eq(tenants.slug, slug.toLowerCase()))
            .get();

          if (tenant) {
            const endDate = tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd) : null;
            const daysLeft = endDate
              ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            subscription = {
              daysLeft,
              endDate: tenant.subscriptionEnd,
              adminUsername: tenant.adminUsername,
              adminPassword: tenant.adminPassword
            };
          }
        }
      }
    } catch (subError) {
      console.warn("Failed to fetch subscription info:", subError);
    }

    return NextResponse.json({
      notifications: notificationList,
      subscription
    });
  } catch (error: any) {
    console.error("Fetch Notifications Error:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const employeeId = await getEmployeeIdFromSession();

    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const isHrAdmin = !!cookieStore.get("hr_auth_token")?.value;

    const url = new URL(request.url);
    const isAdminRequest = url.searchParams.get("admin") === "true";

    if (isAdminRequest && !isHrAdmin) {
      return NextResponse.json({ message: "Unauthorized Admin" }, { status: 401 });
    }

    if (!isAdminRequest && !employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const targetEmployeeId = isAdminRequest ? null : employeeId;

    const body = (await request.json()) as any;
    const { id, all } = body;
    const db = await getTenantDb();

    if (all) {
      if (targetEmployeeId === null) {
        await db
          .update(notifications)
          .set({ isRead: true, updatedAt: now() })
          .where(and(isNull(notifications.employeeId), eq(notifications.isRead, false)));
      } else {
        await db
          .update(notifications)
          .set({ isRead: true, updatedAt: now() })
          .where(
            and(eq(notifications.employeeId, targetEmployeeId), eq(notifications.isRead, false))
          );
      }
    } else if (id) {
      if (isAdminRequest) {
        // HR admin: mark by ID only (no employeeId filter, HR notifs have null employeeId)
        await db
          .update(notifications)
          .set({ isRead: true, updatedAt: now() })
          .where(eq(notifications.id, id));
      } else {
        // Employee: mark by ID + employeeId for security
        await db
          .update(notifications)
          .set({ isRead: true, updatedAt: now() })
          .where(and(eq(notifications.id, id), eq(notifications.employeeId, targetEmployeeId!)));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update Notification Error:", error);
    return NextResponse.json({ message: error.message || "Failed to update notification" }, { status: 500 });
  }
}
