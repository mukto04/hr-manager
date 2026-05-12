export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { breakRequests, employees } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function GET(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getTenantDb();

    const requests = await db
      .select()
      .from(breakRequests)
      .where(eq(breakRequests.employeeId, employeeId))
      .orderBy(desc(breakRequests.createdAt));

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Fetch break requests error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, startTime, endTime, reason } = (await request.json()) as any;

    if (!date || !startTime || !endTime || !reason) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const db = await getTenantDb();

    const newRequest = await db
      .insert(breakRequests)
      .values({
        id: newId(),
        employeeId,
        date: new Date(date).toISOString(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reason,
        status: "PENDING",
        createdAt: now(),
        updatedAt: now()
      })
      .returning()
      .get();

    // Fetch employee name for notification
    const employee = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

    // Notify HR
    const { createNotification } = await import("@/lib/notify");
    await createNotification({
      title: "New Break Request",
      message: `${employee?.name || 'An employee'} submitted a break request for ${new Date(date).toLocaleDateString()}. Reason: ${reason}`,
      type: "BREAK"
    }); // No employeeId means it goes to HR

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error("Submit break request error:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}
