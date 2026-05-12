export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { breakRecords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as any;
    const { startTime, endTime, note } = body;

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    let duration = 0;

    if (start && end) {
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const recordDate = new Date(start);
    recordDate.setHours(0, 0, 0, 0);
    const recordDateStr = recordDate.toISOString();

    const db = await getTenantDb();

    const breakRecord = await db
      .update(breakRecords)
      .set({
        date: recordDateStr,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : null,
        duration,
        note: note || null,
        updatedAt: now(),
      })
      .where(eq(breakRecords.id, id))
      .returning()
      .get();

    return NextResponse.json(breakRecord);
  } catch (error: any) {
    console.error("Error updating break record:", error);
    return NextResponse.json({ message: "Failed to update break record" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = await getTenantDb();
    await db.delete(breakRecords).where(eq(breakRecords.id, id));

    return NextResponse.json({ message: "Break record deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting break record:", error);
    return NextResponse.json({ message: "Failed to delete break record" }, { status: 500 });
  }
}
