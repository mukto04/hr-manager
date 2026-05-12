import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await (await getTenantPrisma()).attendanceRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Fetch requests error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, checkIn, checkOut, reason, attachment } = await request.json();

    if (!date || !reason) {
      return NextResponse.json({ message: "Date and Reason are required" }, { status: 400 });
    }

    if (!checkIn && !checkOut) {
      return NextResponse.json({ message: "At least one time (Check-In or Check-Out) is required" }, { status: 400 });
    }

    if (checkIn && checkOut) {
      const ci = new Date(checkIn);
      const co = new Date(checkOut);
      if (co <= ci) {
        return NextResponse.json({ message: "Check-out time must be after check-in time" }, { status: 400 });
      }
    }

    const newRequest = await (await getTenantPrisma()).attendanceRequest.create({
      data: {
        employeeId,
        date: new Date(date),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        reason,
        attachment: attachment || null,
        status: "PENDING",
      },
      include: { employee: true }
    });

    // Notify HR
    const { createNotification } = await import("@/lib/notify");
    await createNotification({
      title: "New Attendance Request",
      message: `${newRequest.employee?.name || 'An employee'} submitted an attendance request for ${new Date(date).toLocaleDateString()}. Reason: ${reason}`,
      type: "ATTENDANCE"
    }); // No employeeId means it goes to HR

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Submit request error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
