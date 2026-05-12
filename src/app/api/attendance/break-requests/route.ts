export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { breakRequests, employees } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const db = await getTenantDb();

    const requests = await db
      .select()
      .from(breakRequests)
      .where(status ? eq(breakRequests.status, status) : undefined)
      .orderBy(desc(breakRequests.createdAt));

    // Fetch employee info separately
    const empIds = [...new Set(requests.map(r => r.employeeId))];
    const emps = empIds.length
      ? await db
          .select({
            id: employees.id,
            name: employees.name,
            employeeCode: employees.employeeCode,
            designation: employees.designation,
          })
          .from(employees)
          .where(inArray(employees.id, empIds))
      : [];
    const empMap = Object.fromEntries(emps.map(e => [e.id, e]));

    const result = requests.map(r => ({ ...r, employee: empMap[r.employeeId] || null }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching break requests:", error);
    return NextResponse.json({ message: "Failed to fetch requests" }, { status: 500 });
  }
}
