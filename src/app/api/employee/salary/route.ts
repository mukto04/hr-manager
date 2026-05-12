import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET() {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const salaryStructure = await (await getTenantPrisma()).salaryStructure.findUnique({
      where: { employeeId }
    });

    const monthlySalaries = await (await getTenantPrisma()).monthlySalary.findMany({
      where: { employeeId },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    return NextResponse.json({ salaryStructure, monthlySalaries });
  } catch (error) {
    console.error("Salary API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
