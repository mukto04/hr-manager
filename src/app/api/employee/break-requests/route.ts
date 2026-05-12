export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const requests = await (await getTenantPrisma()).breakRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Fetch break requests error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, startTime, endTime, reason } = (await request.json()) as any;

    if (!date || !startTime || !endTime || !reason) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const newRequest = await (await getTenantPrisma()).breakRequest.create({
      data: {
        employeeId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
        status: "PENDING",
      },
      include: { employee: true }
    });

    // Notify HR
    const { createNotification } = await import("@/lib/notify");
    await createNotification({
      title: "New Break Request",
      message: `${newRequest.employee?.name || 'An employee'} submitted a break request for ${new Date(date).toLocaleDateString()}. Reason: ${reason}`,
      type: "BREAK"
    }); // No employeeId means it goes to HR

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error("Submit break request error:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}

