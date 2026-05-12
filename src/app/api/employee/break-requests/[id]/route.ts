export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { date, startTime, endTime, reason } = (await request.json()) as any;

    const prisma = await getTenantPrisma();

    // Check if request exists and is still PENDING
    const existingRequest = await prisma.breakRequest.findUnique({
      where: { id, employeeId }
    });

    if (!existingRequest) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json({ message: "Only pending requests can be edited" }, { status: 400 });
    }

    const updatedRequest = await prisma.breakRequest.update({
      where: { id },
      data: {
        date: new Date(date),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason
      }
    });

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Update break request error:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const prisma = await getTenantPrisma();

    const existingRequest = await prisma.breakRequest.findUnique({
      where: { id, employeeId }
    });

    if (!existingRequest || existingRequest.status !== "PENDING") {
      return NextResponse.json({ message: "Cannot delete this request" }, { status: 400 });
    }

    await prisma.breakRequest.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
