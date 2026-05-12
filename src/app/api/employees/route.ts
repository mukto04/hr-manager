import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, masterPrisma, getTenantSlug } from "@/lib/prisma";
import { employeeSchema } from "@/app/api/_helpers";
import { calculateSalaryBreakdown } from "@/utils/calculations";
import { calculateProRataLeave } from "@/utils/leave-calculator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    const employees = await (await getTenantPrisma()).employee.findMany({
      where: showAll ? {} : { status: "ACTIVE" },
      include: { 
        salaryStructure: true,
        loans: { where: { dueAmount: { gt: 0 } } }
      },
      orderBy: { joiningDate: "asc" }
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ message: "Failed to fetch employees", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    const parsed = employeeSchema.parse(rawData);

    const tenantPrisma = await getTenantPrisma();
    const slug = await getTenantSlug();

    // 1. Check Employee Limit
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { employeeLimit: true }
    });

    const currentCount = await tenantPrisma.employee.count({
      where: { status: "ACTIVE" }
    });

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

    // Use a transaction to ensure all related records are created together
    const newEmployee = await tenantPrisma.$transaction(async (tx) => {
      // 1. Create Employee
      // @ts-ignore
      const employee = await tx.employee.create({
        data: {
          employeeCode: employeeData.employeeCode,
          // @ts-ignore
          fingerprintId: employeeData.fingerprintId || null,
          name: employeeData.name,
          designation: employeeData.designation,
          department: employeeData.department || null,
          email: employeeData.email || null,
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
          status: "ACTIVE"
        }
      });


      // 2. Create Leave Balance (Smart Pro-rata based on existing year standard)
      const currentYear = new Date().getFullYear();
      
      // Look for an existing record to find the "Annual Standard" for this year
      // (This is a simplified way to find the policy defined during "Generate Balances")
      const sampleBalance = await tx.leaveBalance.findFirst({
        where: { year: currentYear, totalLeave: { gt: 0 } }
      });

      const annualStandard = sampleBalance?.totalLeave || 10; // Default to 10 if not generated yet
      const proRataAmount = calculateProRataLeave(
        new Date(employeeData.joiningDate),
        currentYear,
        annualStandard
      );

      await tx.leaveBalance.create({
        data: {
          employeeId: employee.id,
          year: currentYear,
          totalLeave: proRataAmount,
          dueLeave: proRataAmount
        }
      });

      // 3. Create Salary Structure
      const settings = await tx.tenantSettings.findFirst();
      const salaryBreakdown = calculateSalaryBreakdown(salary || 0, settings?.salaryStructure as any[] | undefined);
      await tx.salaryStructure.create({
        data: {
          employeeId: employee.id,
          totalSalary: salary || 0,
          basicSalary: salaryBreakdown.basicSalary,
          hra: salaryBreakdown.hra,
          medicalAllowance: salaryBreakdown.medicalAllowance,
          travelAllowance: salaryBreakdown.travelAllowance,
          others: salaryBreakdown.others,
          festivalBonus: salaryBreakdown.festivalBonus || 0,
          breakdown: salaryBreakdown.breakdown
        } as any
      });

      // 4. Create Initial Monthly Salary for current month
      const now = new Date();
      const initialSalary = salary || 0;
      const { festivalBonus, ...monthlyBreakdown } = salaryBreakdown;

      await tx.monthlySalary.create({
        data: {
          employeeId: employee.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          totalSalary: initialSalary,
          basicSalary: salaryBreakdown.basicSalary,
          hra: salaryBreakdown.hra,
          medicalAllowance: salaryBreakdown.medicalAllowance,
          travelAllowance: salaryBreakdown.travelAllowance,
          others: salaryBreakdown.others,
          breakdown: salaryBreakdown.breakdown,
          workingDays: 30,
          workingDaySalary: initialSalary,
          advanceSalaryAmount: 0,
          loanAdjustAmount: 0,
          payableSalary: initialSalary,
          totalSalaryPaid: initialSalary,
          isPaid: false
        } as any
      });
      return employee;
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error("Employee Creation Error:", error);
    return NextResponse.json(
      { message: "Failed to create employee", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
