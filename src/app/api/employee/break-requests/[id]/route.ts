export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { breakRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const { date, startTime, endTime, reason } = (await request.json()) as any;

    const db = await getTenantDb();

    // Check if request exists and is still PENDING
    const existingRequest = await db
      .select()
      .from(breakRequests)
      .where(and(eq(breakRequests.id, id), eq(breakRequests.employeeId, employeeId)))
      .get();

    if (!existingRequest) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json({ message: "Only pending requests can be edited" }, { status: 400 });
    }

    const updatedRequest = await db
      .update(breakRequests)
      .set({
        date: new Date(date).toISOString(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reason,
        updatedAt: now()
      })
      .where(eq(breakRequests.id, id))
      .returning()
      .get();

    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Update break request error:", error);
    return NextResponse.json({ message: error.message || "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const employeeId = await getEmployeeIdFromSession();
  if (!employeeId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const db = await getTenantDb();

    const existingRequest = await db
      .select()
      .from(breakRequests)
      .where(and(eq(breakRequests.id, id), eq(breakRequests.employeeId, employeeId)))
      .get();

    if (!existingRequest || existingRequest.status !== "PENDING") {
      return NextResponse.json({ message: "Cannot delete this request" }, { status: 400 });
    }

    await db.delete(breakRequests).where(eq(breakRequests.id, id));

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
