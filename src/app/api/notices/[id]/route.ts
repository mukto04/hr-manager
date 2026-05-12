export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, now } from "@/lib/db";
import { notices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as any;
    const { title, content, image, file } = body;

    const db = await getTenantDb();
    const notice = await db
      .update(notices)
      .set({ title, content, image, file, updatedAt: now() })
      .where(eq(notices.id, id))
      .returning()
      .get();

    return NextResponse.json(notice);
  } catch (error: any) {
    console.error("Notice Update Error:", error);
    return NextResponse.json({ message: error.message || "Failed to update notice" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = await getTenantDb();
    await db.delete(notices).where(eq(notices.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notice Delete Error:", error);
    return NextResponse.json({ message: error.message || "Failed to delete notice" }, { status: 500 });
  }
}
