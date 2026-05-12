export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import {
  employees,
  salaryStructures,
  salaryIncrements,
  monthlySalaries,
  tenantSettings,
} from "@/lib/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { calculateSalaryBreakdown } from "@/utils/calculations";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "ACTIVE";

    const db = await getTenantDb();

    const allEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.status, status));

    const empIds = allEmployees.map(e => e.id);

    const allStructures = empIds.length
      ? await db.select().from(salaryStructures).where(inArray(salaryStructures.employeeId, empIds))
      : [];
    const structureMap = Object.fromEntries(allStructures.map(s => [s.employeeId, s]));

    const allIncrements = empIds.length
      ? await db
          .select()
          .from(salaryIncrements)
          .where(inArray(salaryIncrements.employeeId, empIds))
      : [];
    // Group increments by employeeId, sorted desc by createdAt
    const incrementsByEmp: Record<string, typeof allIncrements> = {};
    for (const inc of allIncrements) {
      if (!incrementsByEmp[inc.employeeId]) incrementsByEmp[inc.employeeId] = [];
      incrementsByEmp[inc.employeeId].push(inc);
    }
    for (const key of Object.keys(incrementsByEmp)) {
      incrementsByEmp[key].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    }

    const result = allEmployees
      .map(e => ({
        ...e,
        salaryStructure: structureMap[e.id] || null,
        increments: incrementsByEmp[e.id] || [],
      }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch increments", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const data = (await request.json()) as any;
    const { employeeIds, type, value, month, year, note } = data;

    if (!employeeIds || employeeIds.length === 0) {
      return NextResponse.json({ message: "No employees selected" }, { status: 400 });
    }

    const targetIds = Array.isArray(employeeIds) ? employeeIds : [];

    const settings = await db.select().from(tenantSettings).limit(1).get();

    const allEmployees = await db
      .select()
      .from(employees)
      .where(inArray(employees.id, targetIds));

    const allStructures = await db
      .select()
      .from(salaryStructures)
      .where(inArray(salaryStructures.employeeId, targetIds));
    const structureMap = Object.fromEntries(allStructures.map(s => [s.employeeId, s]));

    const processed: string[] = [];

    const nowDate = new Date();
    const curMonth = nowDate.getMonth() + 1;
    const curYear = nowDate.getFullYear();

    for (const employee of allEmployees) {
      const structure = structureMap[employee.id];
      if (!structure) continue;

      const oldSalary = structure.totalSalary;
      const basicSalary = structure.basicSalary;
      let incrementAmount = 0;
      let percentage: number | null = null;

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
      const breakdown = calculateSalaryBreakdown(
        newSalary,
        settings?.salaryStructure as any[] | undefined
      );

      await db
        .update(salaryStructures)
        .set({
          totalSalary: newSalary,
          basicSalary: breakdown.basicSalary,
          hra: breakdown.hra,
          medicalAllowance: breakdown.medicalAllowance,
          travelAllowance: breakdown.travelAllowance,
          others: breakdown.others,
          festivalBonus: breakdown.festivalBonus || 0,
          breakdown: breakdown.breakdown as any,
          updatedAt: now(),
        })
        .where(eq(salaryStructures.employeeId, employee.id));

      // 2. Create Increment Record
      await db.insert(salaryIncrements).values({
        id: newId(),
        employeeId: employee.id,
        amount: incrementAmount,
        percentage,
        type,
        oldSalary,
        newSalary,
        effectiveMonth: Number(month),
        effectiveYear: Number(year),
        note,
        createdAt: now(),
        updatedAt: now(),
      });

      // 3. Update current month salary if applicable
      if (Number(month) === curMonth && Number(year) === curYear) {
        await db
          .update(monthlySalaries)
          .set({
            totalSalary: newSalary,
            basicSalary: breakdown.basicSalary,
            hra: breakdown.hra,
            medicalAllowance: breakdown.medicalAllowance,
            travelAllowance: breakdown.travelAllowance,
            others: breakdown.others,
            breakdown: breakdown.breakdown as any,
            workingDaySalary: newSalary,
            payableSalary: sql`${monthlySalaries.payableSalary} + ${incrementAmount}`,
            updatedAt: now(),
          })
          .where(
            and(
              eq(monthlySalaries.employeeId, employee.id),
              eq(monthlySalaries.month, curMonth),
              eq(monthlySalaries.year, curYear),
              eq(monthlySalaries.isPaid, false)
            )
          );
      }

      processed.push(employee.id);
    }

    return NextResponse.json({
      message: `Successfully applied increment to ${processed.length} employees`,
      count: processed.length,
    });
  } catch (error: any) {
    console.error("Increment Error:", error);
    return NextResponse.json(
      { message: "Failed to apply increment", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Increment ID is required" }, { status: 400 });
    }

    const db = await getTenantDb();
    const settings = await db.select().from(tenantSettings).limit(1).get();

    // 1. Find the increment record
    const increment = await db
      .select()
      .from(salaryIncrements)
      .where(eq(salaryIncrements.id, id))
      .get();

    if (!increment) {
      return NextResponse.json({ message: "Increment record not found" }, { status: 404 });
    }

    // 2. Fetch current salary structure
    const structure = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.employeeId, increment.employeeId))
      .get();

    if (structure) {
      // 3. Revert Salary
      const newSalary = structure.totalSalary - increment.amount;
      const breakdown = calculateSalaryBreakdown(
        newSalary,
        settings?.salaryStructure as any[] | undefined
      );

      await db
        .update(salaryStructures)
        .set({
          totalSalary: newSalary,
          basicSalary: breakdown.basicSalary,
          hra: breakdown.hra,
          medicalAllowance: breakdown.medicalAllowance,
          travelAllowance: breakdown.travelAllowance,
          others: breakdown.others,
          festivalBonus: breakdown.festivalBonus || 0,
          breakdown: breakdown.breakdown as any,
          updatedAt: now(),
        })
        .where(eq(salaryStructures.employeeId, increment.employeeId));

      // 4. Update current month salary if it was already updated
      const nowDate = new Date();
      const curMonth = nowDate.getMonth() + 1;
      const curYear = nowDate.getFullYear();

      if (increment.effectiveMonth === curMonth && increment.effectiveYear === curYear) {
        await db
          .update(monthlySalaries)
          .set({
            totalSalary: newSalary,
            basicSalary: breakdown.basicSalary,
            hra: breakdown.hra,
            medicalAllowance: breakdown.medicalAllowance,
            travelAllowance: breakdown.travelAllowance,
            others: breakdown.others,
            breakdown: breakdown.breakdown as any,
            workingDaySalary: newSalary,
            payableSalary: sql`${monthlySalaries.payableSalary} - ${increment.amount}`,
            updatedAt: now(),
          })
          .where(
            and(
              eq(monthlySalaries.employeeId, increment.employeeId),
              eq(monthlySalaries.month, curMonth),
              eq(monthlySalaries.year, curYear),
              eq(monthlySalaries.isPaid, false)
            )
          );
      }
    }

    // 5. Delete the increment record
    await db.delete(salaryIncrements).where(eq(salaryIncrements.id, id));

    return NextResponse.json({ message: "Increment reverted successfully" });
  } catch (error: any) {
    console.error("Revert Error:", error);
    return NextResponse.json(
      { message: "Failed to revert increment", error: error.message },
      { status: 500 }
    );
  }
}
