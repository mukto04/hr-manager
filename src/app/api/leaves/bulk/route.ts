import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

import { calculateProRataLeave } from "@/utils/leave-calculator";

export async function POST(request: NextRequest) {
  try {
    const { year, defaultAmount, overwrite = false } = await request.json();

    if (!year || defaultAmount === undefined) {
      return NextResponse.json({ message: "Year and defaultAmount are required" }, { status: 400 });
    }

    const prisma = await getTenantPrisma();
    
    // 1. Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" }
    });

    let createdCount = 0;
    let updatedCount = 0;
    
    // 2. Use a transaction to create or update balances
    await prisma.$transaction(async (tx) => {
      for (const emp of employees) {
        // Calculate Pro-rata amount for this specific employee
        const proRataAmount = calculateProRataLeave(
          new Date(emp.joiningDate),
          parseInt(year),
          parseInt(defaultAmount)
        );

        // Check if balance already exists for this year
        const exists = await tx.leaveBalance.findFirst({
          where: { employeeId: emp.id, year: parseInt(year) }
        });

        if (!exists) {
          await tx.leaveBalance.create({
            data: {
              employeeId: emp.id,
              year: parseInt(year),
              totalLeave: proRataAmount,
              dueLeave: proRataAmount
            }
          });
          createdCount++;
        } else if (overwrite) {
          await tx.leaveBalance.update({
            where: { id: exists.id },
            data: {
              totalLeave: proRataAmount,
              dueLeave: proRataAmount
            }
          });
          updatedCount++;
        }
      }
    });

    return NextResponse.json({ 
      message: `Processed ${employees.length} employees. Generated ${createdCount} new records and updated ${updatedCount} existing records.`,
      count: createdCount + updatedCount 
    });

  } catch (error) {
    console.error("Bulk leave generation error:", error);
    return NextResponse.json({ message: "Failed to generate leave balances", error }, { status: 500 });
  }
}
