import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE"; // ACTIVE or DEACTIVE

    const prisma = await getTenantPrisma();
    const employees = await prisma.employee.findMany({
      where: { status },
      include: {
        salaryStructure: true,
        increments: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch increments", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const data = await request.json();
    const { employeeIds, type, value, month, year, note } = data;

    if (!employeeIds || employeeIds.length === 0) {
      return NextResponse.json({ message: "No employees selected" }, { status: 400 });
    }

    const targetIds = Array.isArray(employeeIds) ? employeeIds : [];
    
    const settings = await prisma.tenantSettings.findFirst();

    const result = await prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: targetIds } },
        include: { salaryStructure: true }
      });

      const processed = [];

      for (const employee of employees) {
        if (!employee.salaryStructure) continue;

        const oldSalary = employee.salaryStructure.totalSalary;
        const basicSalary = employee.salaryStructure.basicSalary;
        let incrementAmount = 0;
        let percentage = null;

        if (type === "FIXED_AMOUNT") {
          incrementAmount = Number(value);
        } else if (type === "PERCENT_TOTAL") {
          percentage = Number(value);
          incrementAmount = (oldSalary * percentage) / 100;
        } else if (type === "PERCENT_BASIC") {
          percentage = Number(value);
          incrementAmount = (basicSalary * percentage) / 100;
        }

        const newSalary = oldSalary + incrementAmount;

        // 1. Update SalaryStructure
        const breakdown = calculateSalaryBreakdown(newSalary, settings?.salaryStructure as any[] | undefined);
        
        await tx.salaryStructure.update({
          where: { employeeId: employee.id },
          data: {
            totalSalary: newSalary,
            basicSalary: breakdown.basicSalary,
            hra: breakdown.hra,
            medicalAllowance: breakdown.medicalAllowance,
            travelAllowance: breakdown.travelAllowance,
            others: breakdown.others,
            festivalBonus: breakdown.festivalBonus || 0,
            breakdown: breakdown.breakdown as any
          }
        });

        // 2. Create Increment Record
        await tx.salaryIncrement.create({
          data: {
            employeeId: employee.id,
            amount: incrementAmount,
            percentage,
            type,
            oldSalary,
            newSalary,
            effectiveMonth: Number(month),
            effectiveYear: Number(year),
            note
          }
        });

        // 3. Update current month salary if applicable
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();

        if (Number(month) === curMonth && Number(year) === curYear) {
            await tx.monthlySalary.updateMany({
                where: {
                    employeeId: employee.id,
                    month: curMonth,
                    year: curYear,
                    isPaid: false
                },
                data: {
                    totalSalary: newSalary,
                    basicSalary: breakdown.basicSalary,
                    hra: breakdown.hra,
                    medicalAllowance: breakdown.medicalAllowance,
                    travelAllowance: breakdown.travelAllowance,
                    others: breakdown.others,
                    breakdown: breakdown.breakdown as any,
                    workingDaySalary: newSalary,
                    payableSalary: { increment: incrementAmount }
                } as any
            });
        }

        processed.push(employee.id);
      }

      return processed;
    });

    return NextResponse.json({ message: `Successfully applied increment to ${result.length} employees`, count: result.length });
  } catch (error: any) {
    console.error("Increment Error:", error);
    return NextResponse.json({ message: "Failed to apply increment", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id"); // Increment Record ID

    if (!id) {
      return NextResponse.json({ message: "Increment ID is required" }, { status: 400 });
    }

    const prisma = await getTenantPrisma();
    const settings = await prisma.tenantSettings.findFirst();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the increment record
      const increment = await tx.salaryIncrement.findUnique({
        where: { id }
      });

      if (!increment) throw new Error("Increment record not found");

      // 2. Fetch current salary structure
      const structure = await tx.salaryStructure.findUnique({
        where: { employeeId: increment.employeeId }
      });

      if (structure) {
        // 3. Revert Salary
        const newSalary = structure.totalSalary - increment.amount;
        const breakdown = calculateSalaryBreakdown(newSalary, settings?.salaryStructure as any[] | undefined);

        await tx.salaryStructure.update({
          where: { employeeId: increment.employeeId },
          data: {
            totalSalary: newSalary,
            basicSalary: breakdown.basicSalary,
            hra: breakdown.hra,
            medicalAllowance: breakdown.medicalAllowance,
            travelAllowance: breakdown.travelAllowance,
            others: breakdown.others,
            festivalBonus: breakdown.festivalBonus || 0,
            breakdown: breakdown.breakdown
          } as any
        });

        // 4. Update current month salary if it was already updated
        const now = new Date();
        const curMonth = now.getMonth() + 1;
        const curYear = now.getFullYear();

        if (increment.effectiveMonth === curMonth && increment.effectiveYear === curYear) {
             await tx.monthlySalary.updateMany({
                 where: {
                     employeeId: increment.employeeId,
                     month: curMonth,
                     year: curYear,
                     isPaid: false
                 },
                 data: {
                     totalSalary: newSalary,
                     basicSalary: breakdown.basicSalary,
                     hra: breakdown.hra,
                     medicalAllowance: breakdown.medicalAllowance,
                     travelAllowance: breakdown.travelAllowance,
                     others: breakdown.others,
                     breakdown: breakdown.breakdown as any,
                     workingDaySalary: newSalary,
                     payableSalary: { decrement: increment.amount }
                 } as any
             });
        }
      }

      // 5. Delete the increment record
      await tx.salaryIncrement.delete({
        where: { id }
      });

      return true;
    });

    return NextResponse.json({ message: "Increment reverted successfully" });
  } catch (error: any) {
    console.error("Revert Error:", error);
    return NextResponse.json({ message: "Failed to revert increment", error: error.message }, { status: 500 });
  }
}
