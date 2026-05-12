export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { monthlySalaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { month, year, percentage } = (await request.json()) as any;

    if (!month || !year || percentage === undefined) {
      return NextResponse.json({ message: "Missing month, year or percentage" }, { status: 400 });
    }

    const db = await getTenantDb();

    const unpaidItems = await db
      .select()
      .from(monthlySalaries)
      .where(
        and(
          eq(monthlySalaries.month, Number(month)),
          eq(monthlySalaries.year, Number(year)),
          eq(monthlySalaries.isPaid, false)
        )
      );

    for (const ms of unpaidItems) {
      const festivalBonus = ms.totalSalary * (Number(percentage) / 100);
      const payableSalary =
        ms.workingDaySalary - ms.advanceSalaryAmount - ms.loanAdjustAmount + festivalBonus;

      await db
        .update(monthlySalaries)
        .set({
          festivalBonus,
          payableSalary,
          totalSalaryPaid: payableSalary,
          updatedAt: now(),
        })
        .where(eq(monthlySalaries.id, ms.id));
    }

    return NextResponse.json({
      message: `Successfully applied ${percentage}% bonus to ${unpaidItems.length} records.`,
    });
  } catch (error) {
    console.error("Bulk Bonus Error:", error);
    return NextResponse.json({ message: "Failed to apply bulk bonus", error }, { status: 500 });
  }
}
