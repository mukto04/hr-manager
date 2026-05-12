export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { attendanceRequests, attendances, tenantSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";
import { createNotification } from "@/lib/notify";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as any;
    const { status, hrNote } = body; // status: APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const db = await getTenantDb();

    const attendanceRequest = await db
      .select()
      .from(attendanceRequests)
      .where(eq(attendanceRequests.id, id))
      .get();

    if (!attendanceRequest) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await db
      .update(attendanceRequests)
      .set({ status, hrNote: hrNote || null, updatedAt: now() })
      .where(eq(attendanceRequests.id, id))
      .returning()
      .get();

    if (status === "APPROVED") {
      const settings = await db.select().from(tenantSettings).get();

      const checkInDate = attendanceRequest.checkIn ? new Date(attendanceRequest.checkIn) : null;
      const checkOutDate = attendanceRequest.checkOut ? new Date(attendanceRequest.checkOut) : null;
      const checkInStr = checkInDate ? checkInDate.toISOString() : null;
      const checkOutStr = checkOutDate ? checkOutDate.toISOString() : null;

      const threshold = settings?.halfDayThreshold || 420;
      const finalStatus = calculateAttendanceStatus(checkInDate, checkOutDate, threshold);

      // Upsert into Attendance table
      const existing = await db
        .select()
        .from(attendances)
        .where(
          and(
            eq(attendances.employeeId, attendanceRequest.employeeId),
            eq(attendances.date, attendanceRequest.date)
          )
        )
        .get();

      if (!existing) {
        await db.insert(attendances).values({
          id: newId(),
          employeeId: attendanceRequest.employeeId,
          date: attendanceRequest.date,
          checkIn: checkInStr,
          checkOut: checkOutStr,
          status: finalStatus,
          isManual: true,
          note: attendanceRequest.reason,
          createdAt: now(),
          updatedAt: now(),
        });
      } else {
        await db
          .update(attendances)
          .set({
            checkIn: checkInStr,
            checkOut: checkOutStr,
            status: finalStatus,
            isManual: true,
            note: attendanceRequest.reason,
            updatedAt: now(),
          })
          .where(eq(attendances.id, existing.id));
      }

      // Sync Leave
      await syncLeaveBalanceForAttendance(
        db,
        attendanceRequest.employeeId,
        existing?.status,
        finalStatus,
        new Date(attendanceRequest.date)
      );
    }

    // Notify Employee
    await createNotification({
      employeeId: attendanceRequest.employeeId,
      title: `Attendance Request ${status}`,
      message: status === "APPROVED"
        ? `Your attendance request for ${new Date(attendanceRequest.date).toLocaleDateString()} has been approved.`
        : `Your attendance request for ${new Date(attendanceRequest.date).toLocaleDateString()} has been rejected.`,
      type: "ATTENDANCE"
    });

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Error updating attendance request:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}
