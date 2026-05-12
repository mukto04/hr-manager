import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { officeCostSchema } from "../_helpers";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "");
    const year  = parseInt(searchParams.get("year")  || "");

    if (!month || !year) {
      return NextResponse.json({ message: "Month and Year are required." }, { status: 400 });
    }

    const records = await (await getTenantPrisma()).officeCost.findMany({
      where: { month, year },
      orderBy: { day: "asc" },
    });

    // Previous month's closing Debit/Cred is the cumulative running balance of that month.
    // We recalculate it here from the stored rows so the frontend can continue from the right number.
    let prevMonth = month - 1;
    let prevYear  = year;
    if (prevMonth === 0) { prevMonth = 12; prevYear = year - 1; }

    const prevRecords = await (await getTenantPrisma()).officeCost.findMany({
      where:   { month: prevMonth, year: prevYear },
      orderBy: { day: "asc" },
    });

    // Reconstruct the running balance from previous month
    let previousBalance = 0;
    prevRecords.forEach(r => {
      previousBalance += (r.payAmount || 0) - (r.bazarCost || 0);
    });

    return NextResponse.json({ records, previousBalance });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch office costs", error }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ message: "Input must be an array." }, { status: 400 });
    }

    const parsedData = z.array(officeCostSchema).parse(data);

    if (parsedData.length === 0) {
      return NextResponse.json({ message: "No data provided." }, { status: 400 });
    }

    await (await getTenantPrisma()).$transaction(async (tx) => {
      for (const row of parsedData) {
        const dateObj = new Date(row.date);

        await tx.officeCost.upsert({
          where: { month_year_day: { month: row.month, year: row.year, day: row.day } },
          update: {
            payAmount:       row.payAmount       ?? 0,
            bazarCost:       row.bazarCost       ?? 0,
            details:         row.details         ?? null,
            extraCost:       row.extraCost       ?? 0,
            extraDetail:     row.extraDetail     ?? null,
            deposit:         row.deposit         ?? 0,
            recurringCost:   row.recurringCost   ?? 0,
            recurringDetail: row.recurringDetail ?? null,
            capitalCost:     row.capitalCost     ?? 0,
            capitalDetail:   row.capitalDetail   ?? null,
          },
          create: {
            date:            dateObj,
            month:           row.month,
            year:            row.year,
            day:             row.day,
            payAmount:       row.payAmount       ?? 0,
            bazarCost:       row.bazarCost       ?? 0,
            details:         row.details         ?? null,
            extraCost:       row.extraCost       ?? 0,
            extraDetail:     row.extraDetail     ?? null,
            deposit:         row.deposit         ?? 0,
            recurringCost:   row.recurringCost   ?? 0,
            recurringDetail: row.recurringDetail ?? null,
            capitalCost:     row.capitalCost     ?? 0,
            capitalDetail:   row.capitalDetail   ?? null,
          },
        });
      }
    }, {
      timeout: 30000 // 30 seconds
    });

    return NextResponse.json({ message: "Saved successfully" }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to save office costs", error }, { status: 400 });
  }
}
