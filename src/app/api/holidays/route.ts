export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { holidaySchema } from "@/app/api/_helpers";

export async function GET() {
  const db = await getTenantDb();
  const result = await db.select().from(holidays).orderBy(asc(holidays.date));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = holidaySchema.parse((await request.json()) as any);

    const db = await getTenantDb();
    const holiday = await db
      .insert(holidays)
      .values({
        id: newId(),
        ...parsed,
        date: new Date(parsed.date).toISOString().substring(0, 10),
        createdAt: now(),
        updatedAt: now()
      })
      .returning()
      .get();

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create holiday", error }, { status: 400 });
  }
}
