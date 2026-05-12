import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentYear = new Date().getFullYear();
    const holidays = await (await getTenantPrisma()).holiday.findMany({
      where: {
        date: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31)
        }
      },
      orderBy: { date: "asc" }
    });

    return NextResponse.json(holidays);
  } catch (error) {
    console.error("Holidays API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
