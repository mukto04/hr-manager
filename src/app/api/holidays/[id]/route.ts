export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { holidaySchema } from "@/app/api/_helpers";

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = holidaySchema.parse((await request.json()) as any);

    const db = await getTenantDb();
    const holiday = await db
      .update(holidays)
      .set({
        ...parsed,
        date: new Date(parsed.date).toISOString().substring(0, 10),
        updatedAt: now()
      })
      .where(eq(holidays.id, id))
      .returning()
      .get();

    return NextResponse.json(holiday);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update holiday", error }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getTenantDb();
    await db.delete(holidays).where(eq(holidays.id, id));
    return NextResponse.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete holiday", error }, { status: 400 });
  }
}
