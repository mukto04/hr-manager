export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { breakRecords, employees } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { endOfMonth } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    const db = await getTenantDb();

    const records = await db
      .select()
      .from(breakRecords)
      .where(
        and(
          gte(breakRecords.date, startDateStr),
          lte(breakRecords.date, endDateStr),
          ...(employeeId && employeeId !== "all" ? [eq(breakRecords.employeeId, employeeId)] : [])
        )
      )
      .orderBy(desc(breakRecords.startTime));

    // Fetch employee info separately
    const empIds = [...new Set(records.map(r => r.employeeId))];
    const emps = empIds.length
      ? await db
          .select({
            id: employees.id,
            name: employees.name,
            employeeCode: employees.employeeCode,
            image: employees.image,
          })
          .from(employees)
          .where(inArray(employees.id, empIds))
      : [];
    const empMap = Object.fromEntries(emps.map(e => [e.id, e]));

    const result = records.map(r => ({ ...r, employee: empMap[r.employeeId] || null }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching break records:", error);
    return NextResponse.json({ message: "Failed to fetch break records" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as any;
    const { employeeId, startTime, endTime, note } = body;

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    let duration = 0;

    if (start && end) {
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    // Normalize date to midnight of the start time's date
    const recordDate = new Date(start);
    recordDate.setHours(0, 0, 0, 0);
    const recordDateStr = recordDate.toISOString();

    const db = await getTenantDb();

    const breakRecord = await db
      .insert(breakRecords)
      .values({
        id: newId(),
        employeeId,
        date: recordDateStr,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : null,
        duration,
        note: note || null,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    // Fetch employee for response
    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

    return NextResponse.json({ ...breakRecord, employee: employee || null });
  } catch (error: any) {
    console.error("Error creating break record:", error);
    return NextResponse.json({ message: "Failed to create break record" }, { status: 500 });
  }
}
