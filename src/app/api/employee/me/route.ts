export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession, getEmployeeSession } from "@/lib/employee-auth";

export async function GET() {
  const session = await getEmployeeSession();
  const employeeId = session?.employeeId as string;
  
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const employee = await (await getTenantPrisma()).employee.findUnique({
      where: { id: employeeId },
      select: { 
        id: true,
        name: true, 
        employeeCode: true, 
        designation: true,
        department: true,
        email: true,
        phone: true,
        joiningDate: true,
        dateOfBirth: true,
        bloodGroup: true,
        guardianName: true,
        guardianRelation: true,
        guardianPhone: true,
        nidNumber: true,
        educationStatus: true,
        fingerprintId: true,
        image: true
      }
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...employee,
      companyName: session?.companyName || "Employee Portal"
    });
  } catch (error) {
    console.error("Me API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

