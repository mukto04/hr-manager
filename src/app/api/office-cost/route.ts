export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { officeCosts } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { officeCostSchema } from "../_helpers";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    if (!month || !year) {
      return NextResponse.json({ message: "Month and Year are required." }, { status: 400 });
    }

    const db = await getTenantDb();

    const records = await db
      .select()
      .from(officeCosts)
      .where(and(eq(officeCosts.month, month), eq(officeCosts.year, year)))
      .orderBy(asc(officeCosts.day));

    // Previous month's closing balance
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const prevRecords = await db
      .select()
      .from(officeCosts)
      .where(and(eq(officeCosts.month, prevMonth), eq(officeCosts.year, prevYear)))
      .orderBy(asc(officeCosts.day));

    // Reconstruct the running balance from previous month
    let previousBalance = 0;
    prevRecords.forEach((r) => {
      previousBalance += (r.payAmount || 0) - (r.bazarCost || 0);
    });

    return NextResponse.json({ records, previousBalance });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch office costs", error }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as any;

    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Input must be an array." }, { status: 400 });
    }

    const parsedData = z.array(officeCostSchema).parse(data);

    if (parsedData.length === 0) {
      return NextResponse.json({ message: "No data provided." }, { status: 400 });
    }

    const db = await getTenantDb();

    for (const row of parsedData) {
      const dateStr = typeof row.date === "string" ? row.date : (row.date as Date).toISOString();

      await db
        .insert(officeCosts)
        .values({
          id: newId(),
          date: dateStr,
          month: row.month,
          year: row.year,
          day: row.day,
          payAmount: row.payAmount ?? 0,
          bazarCost: row.bazarCost ?? 0,
          details: row.details ?? null,
          extraCost: row.extraCost ?? 0,
          extraDetail: row.extraDetail ?? null,
          deposit: row.deposit ?? 0,
          recurringCost: row.recurringCost ?? 0,
          recurringDetail: row.recurringDetail ?? null,
          capitalCost: row.capitalCost ?? 0,
          capitalDetail: row.capitalDetail ?? null,
          createdAt: now(),
          updatedAt: now(),
        })
        .onConflictDoUpdate({
          target: [officeCosts.month, officeCosts.year, officeCosts.day],
          set: {
            payAmount: row.payAmount ?? 0,
            bazarCost: row.bazarCost ?? 0,
            details: row.details ?? null,
            extraCost: row.extraCost ?? 0,
            extraDetail: row.extraDetail ?? null,
            deposit: row.deposit ?? 0,
            recurringCost: row.recurringCost ?? 0,
            recurringDetail: row.recurringDetail ?? null,
            capitalCost: row.capitalCost ?? 0,
            capitalDetail: row.capitalDetail ?? null,
            updatedAt: now(),
          },
        });
    }

    return NextResponse.json({ message: "Saved successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to save office costs", error }, { status: 400 });
  }
}
