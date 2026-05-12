import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { employeeSchema } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const rawData = await request.json();
    const parsed = employeeSchema.parse(rawData);

    // Filter out `salary` and `status` from schema-parsed data
    const { salary, ...employeeData } = parsed;
    // Allow explicit status updates (e.g., restore from DISABLED -> ACTIVE)
    const statusOverride = (rawData.status as string | undefined) ?? undefined;

    // @ts-ignore
    const employee = await (await getTenantPrisma()).employee.update({
      where: { id },
      data: {
        ...employeeData,
        email: employeeData.email || null,
        department: employeeData.department || null,
        phone: employeeData.phone || null,
        joiningDate: new Date(employeeData.joiningDate),
        dateOfBirth: new Date(employeeData.dateOfBirth),
        bloodGroup: employeeData.bloodGroup || null,
        guardianName: employeeData.guardianName || null,
        guardianRelation: employeeData.guardianRelation || null,
        guardianPhone: employeeData.guardianPhone || null,
        nidNumber: employeeData.nidNumber || null,
        educationStatus: employeeData.educationStatus || null,
        customData: employeeData.customData || {},
        ...(statusOverride ? { status: statusOverride } : {})
      }
    });

    if (salary !== undefined && salary > 0) {
      const prisma = await getTenantPrisma();
      const settings = await prisma.tenantSettings.findFirst();
      const salaryBreakdown = calculateSalaryBreakdown(salary, settings?.salaryStructure as any[] | undefined);

      await prisma.salaryStructure.upsert({
        where: { employeeId: id },
        create: {
          employeeId: id,
          totalSalary: salary,
          ...salaryBreakdown
        },
        update: {
          totalSalary: salary,
          ...salaryBreakdown
        }
      });

      const now = new Date();
      const { festivalBonus, ...breakdown } = salaryBreakdown;
      await (await getTenantPrisma()).monthlySalary.updateMany({
        where: {
          employeeId: id,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        },
        data: {
          totalSalary: salary,
          ...breakdown
        }
      });
    }

    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update employee", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await (await getTenantPrisma()).employee.update({
      where: { id },
      data: { status: "DEACTIVE" }
    });
    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete employee", error }, { status: 400 });
  }
}
