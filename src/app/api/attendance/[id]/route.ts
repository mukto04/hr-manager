import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";
import { createNotification } from "@/lib/notify";

export const runtime = "edge";

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

    const prisma = await getTenantPrisma();

    const attendance = await prisma.$transaction(async (tx) => {
      // 1. Get old record
      const existing = await tx.attendance.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error("Attendance record not found");
      }

      const settings = await tx.tenantSettings.findFirst();
      const threshold = settings?.halfDayThreshold || 420;
      const lateThresholdTime = settings?.lateThresholdTime;
      const weeklySchedule = settings?.weeklySchedule as any[];
      const defaultInTime = settings?.defaultInTime;

      // 2. Determine new status
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

      // 3. Update record
      const record = await tx.attendance.update({
        where: { id },
        data: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          status: finalStatus,
          isManual: isManual !== undefined ? isManual : true,
          note,
        },
      });

      // 4. Sync Leave Balance
      await syncLeaveBalanceForAttendance(tx, existing.employeeId, existing.status, finalStatus, existing.date);

      return record;
    });

    // Notify Employee
    const dateStr = new Date(attendance.date).toLocaleDateString();
    await createNotification({
      employeeId: attendance.employeeId,
      title: "Attendance Updated",
      message: `Your attendance record for ${dateStr} has been manually updated to ${attendance.status} by HR.`,
      type: "ATTENDANCE"
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("Error updating attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to update attendance" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = await getTenantPrisma();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new Error("Attendance record not found");
      }

      // Refund leave if it was a half day
      if (existing.status === "HALF_DAY") {
        await syncLeaveBalanceForAttendance(tx, existing.employeeId, "HALF_DAY", "DELETED", existing.date);
      }

      await tx.attendance.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Attendance record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting attendance:", error);
    return NextResponse.json({ message: error.message || "Failed to delete attendance" }, { status: 500 });
  }
}
