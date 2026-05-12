export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, getDb, getTenantSlug, newId, now } from "@/lib/db";
import { employees, salaryStructures, leaveBalances, monthlySalaries, tenantSettings, tenants, loans } from "@/lib/db/schema";
import { eq, and, gt, asc, count } from "drizzle-orm";
import { employeeSchema } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";
import { calculateProRataLeave } from "@/utils/leave-calculator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const db = await getTenantDb();

    const empList = await db
      .select()
      .from(employees)
      .where(showAll ? undefined : eq(employees.status, "ACTIVE"))
      .orderBy(asc(employees.joiningDate));

    // Fetch related data for each employee
    const result = await Promise.all(
      empList.map(async (emp) => {
        const salaryStructure = await db
          .select()
          .from(salaryStructures)
          .where(eq(salaryStructures.employeeId, emp.id))
          .get();

        const empLoans = await db
          .select()
          .from(loans)
          .where(and(eq(loans.employeeId, emp.id), gt(loans.dueAmount, 0)));

        return { ...emp, salaryStructure: salaryStructure || null, loans: empLoans };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ message: "Failed to fetch employees", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawData = (await request.json()) as any;
    const parsed = employeeSchema.parse(rawData);

    const db = await getTenantDb();
    const slug = await getTenantSlug();

    // 1. Check Employee Limit
    const tenant = await getDb()
      .select({ employeeLimit: tenants.employeeLimit })
      .from(tenants)
      .where(eq(tenants.slug, slug.toLowerCase()))
      .get();

    const countResult = await db
      .select({ count: count() })
      .from(employees)
      .where(eq(employees.status, "ACTIVE"))
      .get();

    const currentCount = countResult?.count ?? 0;

    if (tenant && currentCount >= (tenant.employeeLimit || 50)) {
      return NextResponse.json(
        {
          message: `Your subscription limit is full. Please contact the service provider to increase the employee limit.`,
          code: "LIMIT_EXCEEDED"
        },
        { status: 403 }
      );
    }

    const { salary, ...employeeData } = parsed;

    // 1. Create Employee
    const employee = await db
      .insert(employees)
      .values({
        id: newId(),
        employeeCode: employeeData.employeeCode,
        fingerprintId: (employeeData as any).fingerprintId || null,
        name: employeeData.name,
        designation: employeeData.designation,
        department: employeeData.department || null,
        email: employeeData.email || null,
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
        status: "ACTIVE",
        createdAt: now(),
        updatedAt: now()
      })
      .returning()
      .get();

    // 2. Create Leave Balance (Smart Pro-rata based on existing year standard)
    const currentYear = new Date().getFullYear();

    const sampleBalance = await db
      .select()
      .from(leaveBalances)
      .where(and(eq(leaveBalances.year, currentYear), gt(leaveBalances.totalLeave, 0)))
      .get();

    const annualStandard = sampleBalance?.totalLeave || 10;
    const proRataAmount = calculateProRataLeave(
      new Date(employeeData.joiningDate),
      currentYear,
      annualStandard
    );

    await db.insert(leaveBalances).values({
      id: newId(),
      employeeId: employee.id,
      year: currentYear,
      totalLeave: proRataAmount,
      dueLeave: proRataAmount,
      createdAt: now(),
      updatedAt: now()
    });

    // 3. Create Salary Structure
    const settings = await db.select().from(tenantSettings).get();
    const salaryBreakdown = calculateSalaryBreakdown(salary || 0, settings?.salaryStructure as any[] | undefined);

    await db.insert(salaryStructures).values({
      id: newId(),
      employeeId: employee.id,
      totalSalary: salary || 0,
      basicSalary: salaryBreakdown.basicSalary,
      hra: salaryBreakdown.hra,
      medicalAllowance: salaryBreakdown.medicalAllowance,
      travelAllowance: salaryBreakdown.travelAllowance,
      others: salaryBreakdown.others,
      festivalBonus: salaryBreakdown.festivalBonus || 0,
      breakdown: salaryBreakdown.breakdown,
      createdAt: now(),
      updatedAt: now()
    } as any);

    // 4. Create Initial Monthly Salary for current month
    const currentNow = new Date();
    const initialSalary = salary || 0;
    const { festivalBonus, ...monthlyBreakdown } = salaryBreakdown;

    await db.insert(monthlySalaries).values({
      id: newId(),
      employeeId: employee.id,
      month: currentNow.getMonth() + 1,
      year: currentNow.getFullYear(),
      totalSalary: initialSalary,
      basicSalary: salaryBreakdown.basicSalary,
      hra: salaryBreakdown.hra,
      medicalAllowance: salaryBreakdown.medicalAllowance,
      travelAllowance: salaryBreakdown.travelAllowance,
      others: salaryBreakdown.others,
      festivalBonus: salaryBreakdown.festivalBonus || 0,
      breakdown: salaryBreakdown.breakdown,
      workingDays: 30,
      workingDaySalary: initialSalary,
      advanceSalaryAmount: 0,
      loanAdjustAmount: 0,
      payableSalary: initialSalary,
      totalSalaryPaid: initialSalary,
      isPaid: false,
      createdAt: now(),
      updatedAt: now()
    } as any);

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Employee Creation Error:", error);
    return NextResponse.json(
      { message: "Failed to create employee", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
