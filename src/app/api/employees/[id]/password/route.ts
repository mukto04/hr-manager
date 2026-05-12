export const runtime = "edge";
import { NextResponse, NextRequest } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as any;

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { message: "Password is required and must be at least 6 characters" },
        { status: 400 }
      );
    }

    const db = await getTenantDb();

    await db
      .update(employees)
      .set({ password: body.password, updatedAt: now() })
      .where(eq(employees.id, id));

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Employee password update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
