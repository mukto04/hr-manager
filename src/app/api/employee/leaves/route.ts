export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const prisma = await getTenantPrisma();
    
    // Get the latest leave balance
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { employeeId },
      orderBy: { year: "desc" },
      take: 1
    });

    // Get all leave records
    const leaveRecords = await prisma.leaveRecord.findMany({
      where: { employeeId },
      orderBy: { date: "desc" }
    });

    return NextResponse.json({
      leaveBalance: leaveBalances[0] || null,
      leaveRecords: leaveRecords || []
    });
  } catch (error) {
    console.error("Leaves API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

