import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const loans = await (await getTenantPrisma()).loan.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" }
    });

    const advances = await (await getTenantPrisma()).advanceSalary.findMany({
      where: { employeeId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    return NextResponse.json({ loans, advances });
  } catch (error) {
    console.error("Loans API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
