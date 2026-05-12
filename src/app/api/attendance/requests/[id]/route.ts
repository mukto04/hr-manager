import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { calculateAttendanceStatus, syncLeaveBalanceForAttendance } from "@/lib/attendance-utils";
import { createNotification } from "@/lib/notify";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, hrNote } = body; // status: APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const attendanceRequest = await (await getTenantPrisma()).attendanceRequest.findUnique({
      where: { id },
    });

    if (!attendanceRequest) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    const updatedRequest = await (await getTenantPrisma()).attendanceRequest.update({
      where: { id },
      data: { status, hrNote },
    });

    if (status === "APPROVED") {
      const prisma = await getTenantPrisma();
      
      const settings = await prisma.tenantSettings.findFirst();
      
      let checkInDate = attendanceRequest.checkIn;
      let checkOutDate = attendanceRequest.checkOut;

      // We only use defaults if BOTH checkIn and checkOut are missing (which shouldn't happen)
      // or if we want to support 'partial' requests without defaults.
      // The previous code was forcing defaults which overrode the user's manual request.

      const threshold = settings?.halfDayThreshold || 420;
      const finalStatus = calculateAttendanceStatus(checkInDate, checkOutDate, threshold);

      // Upsert into Attendance table within a transaction
      await prisma.$transaction(async (tx) => {
        const existing = await tx.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: attendanceRequest.employeeId,
              date: attendanceRequest.date,
            }
          }
        });

        const record = await tx.attendance.upsert({
          where: {
            employeeId_date: {
              employeeId: attendanceRequest.employeeId,
              date: attendanceRequest.date,
            }
          },
          update: {
            checkIn: checkInDate,
            checkOut: checkOutDate,
            status: finalStatus,
            isManual: true,
            note: attendanceRequest.reason,
          },
          create: {
            employeeId: attendanceRequest.employeeId,
            date: attendanceRequest.date,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            status: finalStatus,
            isManual: true,
            note: attendanceRequest.reason,
          }
        });

        // Sync Leave
        await syncLeaveBalanceForAttendance(tx, attendanceRequest.employeeId, existing?.status, finalStatus, attendanceRequest.date);
      });
    }

    // Notify Employee
    const dateStr = new Date(attendanceRequest.date).toLocaleDateString();
    await createNotification({
      employeeId: attendanceRequest.employeeId,
      title: `Attendance Request ${status}`, // Status is APPROVED or REJECTED
      message: status === "APPROVED" 
        ? `Your attendance request for {date} has been approved.`
        : `Your attendance request for {date} has been rejected.`,
      type: "ATTENDANCE"
    });

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Error updating attendance request:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}
