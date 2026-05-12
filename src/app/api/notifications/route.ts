import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
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

    const prisma = await getTenantPrisma();

    // 1. Check for due Note Reminders and convert to Notifications
    const now = new Date();
    const dueNotes = await prisma.note.findMany({
      where: {
        reminderAt: { lte: now },
        isReminderNotified: false
      }
    });

    if (dueNotes.length > 0) {
      console.log(`[Notifications API] Found ${dueNotes.length} due notes.`);
      for (const note of dueNotes) {
        try {
          await prisma.notification.create({
            data: {
              employeeId: null, // HR level notification
              title: "Note Reminder",
              message: note.title ? `Reminder: ${note.title}` : `Reminder: ${note.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...`,
              type: "REMINDER"
            }
          });
          await prisma.note.update({
            where: { id: note.id },
            data: { isReminderNotified: true }
          });
          console.log(`[Notifications API] Created reminder for note: ${note.id}`);
        } catch (err) {
          console.error(`[Notifications API] Failed to create notification for note ${note.id}:`, err);
        }
      }
    }

    // Auto-cleanup: Delete notifications older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await prisma.notification.deleteMany({
      where: {
        employeeId: targetEmployeeId,
        createdAt: { lt: sevenDaysAgo }
      }
    });

    const notifications = await prisma.notification.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    // --- Subscription & Admin Info Fetch ---
    let subscription = null;
    try {
      const { cookies } = await import("next/headers");
      const jose = await import("jose");
      const { masterPrisma } = await import("@/lib/prisma");
      
      const cookieStore = await cookies();
      const token = cookieStore.get("hr_auth_token")?.value;
      
      if (token) {
        const secret = new TextEncoder().encode(
          process.env.SESSION_SECRET || "appdevs-hr-portal-secure-vault-998877"
        );
        const { payload } = await jose.jwtVerify(token, secret);
        const slug = payload.slug as string;

        if (slug) {
          const tenant = await masterPrisma.tenant.findUnique({
            where: { slug },
            select: { 
              subscriptionEnd: true, 
              adminUsername: true, 
              adminPassword: true 
            }
          });

          if (tenant) {
            const endDate = tenant.subscriptionEnd ? new Date(tenant.subscriptionEnd) : null;
            const daysLeft = endDate ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

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
      notifications,
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

    const body = await request.json();
    const { id, all } = body;
    const prisma = await getTenantPrisma();
    
    if (all) {
      await prisma.notification.updateMany({
        where: { employeeId: targetEmployeeId, isRead: false },
        data: { isRead: true }
      });
    } else if (id) {
      if (isAdminRequest) {
        // HR admin: mark by ID only (no employeeId filter, HR notifs have null employeeId)
        await prisma.notification.update({
          where: { id },
          data: { isRead: true }
        });
      } else {
        // Employee: mark by ID + employeeId for security
        await prisma.notification.update({
          where: { id, employeeId: targetEmployeeId },
          data: { isRead: true }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update Notification Error:", error);
    return NextResponse.json({ message: error.message || "Failed to update notification" }, { status: 500 });
  }
}
