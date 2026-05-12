export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { breakRequests, breakRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/notify";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { status, hrNote } = (await request.json()) as any;

    if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

    const db = await getTenantDb();

    // Fetch the break request first to get employeeId
    const breakReq = await db
      .select()
      .from(breakRequests)
      .where(eq(breakRequests.id, id))
      .get();

    if (!breakReq) return NextResponse.json({ message: "Request not found" }, { status: 404 });

    // If approved, create a BreakRecord
    if (status === "APPROVED") {
      // Calculate duration
      const duration = Math.floor(
        (new Date(breakReq.endTime).getTime() - new Date(breakReq.startTime).getTime()) / 60000
      );

      await db
        .update(breakRequests)
        .set({ status: "APPROVED", hrNote: hrNote || null, updatedAt: now() })
        .where(eq(breakRequests.id, id));

      await db.insert(breakRecords).values({
        id: newId(),
        employeeId: breakReq.employeeId,
        date: breakReq.date,
        startTime: breakReq.startTime,
        endTime: breakReq.endTime,
        duration,
        note: breakReq.reason,
        createdAt: now(),
        updatedAt: now(),
      });
    } else {
      await db
        .update(breakRequests)
        .set({ status, hrNote: hrNote || null, updatedAt: now() })
        .where(eq(breakRequests.id, id));
    }

    // Notify Employee
    const dateStr = new Date(breakReq.date).toLocaleDateString();
    await createNotification({
      employeeId: breakReq.employeeId,
      title: `Break Request ${status}`,
      message: `Your break request for ${dateStr} has been ${status.toLowerCase()}.${hrNote ? ` HR Note: ${hrNote}` : ''}`,
      type: "BREAK"
    });

    return NextResponse.json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error("Error processing break request:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
