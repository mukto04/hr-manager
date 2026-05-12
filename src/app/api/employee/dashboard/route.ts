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
    
    // Parallel data fetching for high performance
    const [employee, attendances, holidays] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          leaveBalances: { where: { year: new Date().getFullYear() } },
          loans: { where: { dueAmount: { gt: 0 } } },
        }
      }),
      prisma.attendance.findMany({
        where: {
          employeeId,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          }
        }
      }),
      prisma.holiday.findMany({
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
        take: 3
      })
    ]);

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const presentCount = attendances.filter(a => a.status === "PRESENT").length;
    const leaveData = employee.leaveBalances[0] || { totalLeave: 0, dueLeave: 0 };

    return NextResponse.json({
      employee: {
        name: employee.name,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
      },
      attendance: { presentCount },
      leaves: { 
        available: leaveData.dueLeave,
        total: leaveData.totalLeave 
      },
      loans: { activeCount: employee.loans.length },
      holidays
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

