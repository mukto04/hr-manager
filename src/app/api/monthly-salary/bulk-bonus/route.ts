import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { month, year, percentage } = await request.json();

    if (!month || !year || percentage === undefined) {
      return NextResponse.json({ message: "Missing month, year or percentage" }, { status: 400 });
    }

    const unpaidItems = await (await getTenantPrisma()).monthlySalary.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        isPaid: false
      }
    });

    for (const ms of unpaidItems) {
      const festivalBonus = ms.totalSalary * (Number(percentage) / 100);
      const payableSalary = ms.workingDaySalary - ms.advanceSalaryAmount - ms.loanAdjustAmount + festivalBonus;

      await (await getTenantPrisma()).monthlySalary.update({
        where: { id: ms.id },
        data: {
          festivalBonus,
          payableSalary,
          totalSalaryPaid: payableSalary
        }
      });
    }

    return NextResponse.json({ message: `Successfully applied ${percentage}% bonus to ${unpaidItems.length} records.` });
  } catch (error) {
    console.error("Bulk Bonus Error:", error);
    return NextResponse.json({ message: "Failed to apply bulk bonus", error }, { status: 500 });
  }
}
