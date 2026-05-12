export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { notices, employees, notifications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const db = await getTenantDb();
    const body = (await request.json()) as any;
    const { title, content, image, file } = body;

    const notice = await db
      .insert(notices)
      .values({ id: newId(), title, content, image, file, createdAt: now(), updatedAt: now() })
      .returning()
      .get();

    // Create notifications for all active employees
    const activeEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.status, "ACTIVE"));

    await Promise.all(
      activeEmployees.map((emp) =>
        db.insert(notifications).values({
          id: newId(),
          employeeId: emp.id,
          title: "New Notice: " + title,
          message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
          type: "NOTICE",
          createdAt: now(),
          updatedAt: now()
        })
      )
    );

    return NextResponse.json(notice);
  } catch (error: any) {
    console.error("Notice Create Error:", error);
    return NextResponse.json({ message: error.message || "Failed to create notice" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getTenantDb();
    const result = await db.select().from(notices).orderBy(desc(notices.createdAt));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch notices" }, { status: 500 });
  }
}
