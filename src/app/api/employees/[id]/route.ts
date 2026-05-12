export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { employees, salaryStructures, monthlySalaries, tenantSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { employeeSchema } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rawData = (await request.json()) as any;
    const parsed = employeeSchema.parse(rawData);

    // Filter out `salary` and `status` from schema-parsed data
    const { salary, ...employeeData } = parsed;
    // Allow explicit status updates (e.g., restore from DISABLED -> ACTIVE)
    const statusOverride = (rawData.status as string | undefined) ?? undefined;

    const db = await getTenantDb();

    const employee = await db
      .update(employees)
      .set({
        ...employeeData,
        email: employeeData.email || null,
        department: employeeData.department || null,
        phone: employeeData.phone || null,
        joiningDate: new Date(employeeData.joiningDate).toISOString(),
        dateOfBirth: new Date(employeeData.dateOfBirth).toISOString(),
        bloodGroup: employeeData.bloodGroup || null,
        guardianName: employeeData.guardianName || null,
        guardianRelation: employeeData.guardianRelation || null,
        guardianPhone: employeeData.guardianPhone || null,
        nidNumber: employeeData.nidNumber || null,
        educationStatus: employeeData.educationStatus || null,
        customData: employeeData.customData || {},
        ...(statusOverride ? { status: statusOverride } : {}),
        updatedAt: now()
      })
      .where(eq(employees.id, id))
      .returning()
      .get();

    if (salary !== undefined && salary > 0) {
      const settings = await db.select().from(tenantSettings).get();
      const salaryBreakdown = calculateSalaryBreakdown(salary, settings?.salaryStructure as any[] | undefined);

      await db
        .insert(salaryStructures)
        .values({
          id: crypto.randomUUID(),
          employeeId: id,
          totalSalary: salary,
          ...salaryBreakdown,
          createdAt: now(),
          updatedAt: now()
        } as any)
        .onConflictDoUpdate({
          target: salaryStructures.employeeId,
          set: {
            totalSalary: salary,
            ...salaryBreakdown,
            updatedAt: now()
          }
        });

      const currentNow = new Date();
      const { festivalBonus, ...breakdown } = salaryBreakdown;
      // updateMany equivalent: update all matching rows
      await db
        .update(monthlySalaries)
        .set({
          totalSalary: salary,
          ...breakdown,
          updatedAt: now()
        })
        .where(
          and(
            eq(monthlySalaries.employeeId, id),
            eq(monthlySalaries.month, currentNow.getMonth() + 1),
            eq(monthlySalaries.year, currentNow.getFullYear())
          )
        );
    }

    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update employee", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getTenantDb();

    await db
      .update(employees)
      .set({ status: "DEACTIVE", updatedAt: now() })
      .where(eq(employees.id, id));

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete employee", error }, { status: 400 });
  }
}
