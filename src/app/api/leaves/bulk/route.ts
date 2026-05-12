export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { employees, leaveBalances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calculateProRataLeave } from "@/utils/leave-calculator";

export async function POST(request: NextRequest) {
  try {
    const { year, defaultAmount, overwrite = false } = (await request.json()) as any;

    if (!year || defaultAmount === undefined) {
      return NextResponse.json({ message: "Year and defaultAmount are required" }, { status: 400 });
    }

    const db = await getTenantDb();

    // 1. Get all active employees
    const activeEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    let createdCount = 0;
    let updatedCount = 0;

    // 2. Create or update balances for each employee
    for (const emp of activeEmployees) {
      // Calculate Pro-rata amount for this specific employee
      const proRataAmount = calculateProRataLeave(
        new Date(emp.joiningDate),
        parseInt(year),
        parseInt(defaultAmount)
      );

      // Check if balance already exists for this year
      const exists = await db
        .select()
        .from(leaveBalances)
        .where(and(eq(leaveBalances.employeeId, emp.id), eq(leaveBalances.year, parseInt(year))))
        .limit(1)
        .get();

      if (!exists) {
        await db.insert(leaveBalances).values({
          id: newId(),
          employeeId: emp.id,
          year: parseInt(year),
          totalLeave: proRataAmount,
          dueLeave: proRataAmount,
          createdAt: now(),
          updatedAt: now()
        });
        createdCount++;
      } else if (overwrite) {
        await db
          .update(leaveBalances)
          .set({ totalLeave: proRataAmount, dueLeave: proRataAmount, updatedAt: now() })
          .where(eq(leaveBalances.id, exists.id));
        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Processed ${activeEmployees.length} employees. Generated ${createdCount} new records and updated ${updatedCount} existing records.`,
      count: createdCount + updatedCount
    });

  } catch (error) {
    console.error("Bulk leave generation error:", error);
    return NextResponse.json({ message: "Failed to generate leave balances", error }, { status: 500 });
  }
}
