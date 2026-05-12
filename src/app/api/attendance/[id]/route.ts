export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { attendances, tenantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";
import { createNotification } from "@/lib/notify";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as any;
    const { checkIn, checkOut, status, isManual, note } = body;

    const checkInDate = checkIn ? new Date(checkIn) : null;
    const checkOutDate = checkOut ? new Date(checkOut) : null;
    const checkInStr = checkInDate ? checkInDate.toISOString() : null;
    const checkOutStr = checkOutDate ? checkOutDate.toISOString() : null;

    const db = await getTenantDb();

    // 1. Get old record
    const existing = await db
      .select()
      .from(attendances)
      .where(eq(attendances.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ message: "Attendance record not found" }, { status: 404 });
    }

    // 2. Get settings
    const settings = await db.select().from(tenantSettings).get();
    const threshold = settings?.halfDayThreshold || 420;
    const lateThresholdTime = settings?.lateThresholdTime;
    const weeklySchedule = settings?.weeklySchedule as any[];
    const defaultInTime = settings?.defaultInTime;

    // 3. Determine new status
    let finalStatus = status;
    if (checkInDate && checkOutDate) {
      finalStatus = calculateAttendanceStatus(
        checkInDate,
        checkOutDate,
        threshold,
        lateThresholdTime,
        weeklySchedule,
        defaultInTime
      );
    } else if (!status) {
      finalStatus = "ABSENT";
    }

    // 4. Update record
    const record = await db
      .update(attendances)
      .set({
        checkIn: checkInStr,
        checkOut: checkOutStr,
        status: finalStatus,
        isManual: isManual !== undefined ? isManual : true,
        note: note || null,
        updatedAt: now(),
      })
      .where(eq(attendances.id, id))
      .returning()
      .get();

    // 5. Sync Leave Balance
    await syncLeaveBalanceForAttendance(db, existing.employeeId, existing.status, finalStatus, new Date(existing.date));

    // Notify Employee
    const dateStr = new Date(record!.date).toLocaleDateString();
    await createNotification({
      employeeId: record!.employeeId,
      title: "Attendance Updated",
      message: `Your attendance record for ${dateStr} has been manually updated to ${record!.status} by HR.`,
      type: "ATTENDANCE"
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to update attendance" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getTenantDb();

    const existing = await db
      .select()
      .from(attendances)
      .where(eq(attendances.id, id))
      .get();

    if (!existing) {
      return NextResponse.json({ message: "Attendance record not found" }, { status: 404 });
    }

    // Refund leave if it was a half day
    if (existing.status === "HALF_DAY") {
      await syncLeaveBalanceForAttendance(db, existing.employeeId, "HALF_DAY", "DELETED", new Date(existing.date));
    }

    await db.delete(attendances).where(eq(attendances.id, id));

    return NextResponse.json({ message: "Attendance record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to delete attendance" }, { status: 500 });
  }
}
