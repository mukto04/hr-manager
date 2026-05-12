export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEmployeeSession } from "@/lib/employee-auth";

export async function GET() {
  const session = await getEmployeeSession();
  const employeeId = session?.employeeId as string;

  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    const employee = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeCode: employees.employeeCode,
        designation: employees.designation,
        department: employees.department,
        email: employees.email,
        phone: employees.phone,
        joiningDate: employees.joiningDate,
        dateOfBirth: employees.dateOfBirth,
        bloodGroup: employees.bloodGroup,
        guardianName: employees.guardianName,
        guardianRelation: employees.guardianRelation,
        guardianPhone: employees.guardianPhone,
        nidNumber: employees.nidNumber,
        educationStatus: employees.educationStatus,
        fingerprintId: employees.fingerprintId,
        image: employees.image
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

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
