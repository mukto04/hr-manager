export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getTenantDb();
    const result = await db
      .select()
      .from(notes)
      .orderBy(desc(notes.isPinned), asc(notes.order), desc(notes.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = await getTenantDb();
    const body = (await req.json()) as any;

    // Get highest order to append to end
    const lastNote = await db
      .select({ order: notes.order })
      .from(notes)
      .orderBy(desc(notes.order))
      .get();
    const nextOrder = (lastNote?.order || 0) + 1;

    const note = await db
      .insert(notes)
      .values({
        id: newId(),
        title: body.title,
        content: body.content,
        color: body.color || "white",
        isPinned: body.isPinned || false,
        reminderAt: body.reminderAt ? new Date(body.reminderAt).toISOString() : null,
        isReminderNotified: false,
        order: nextOrder,
        createdAt: now(),
        updatedAt: now()
      })
      .returning()
      .get();
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = await getTenantDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = (await req.json()) as any;

    if (id) {
      // Update specific note
      const updateData: any = {
        updatedAt: now()
      };
      if (body.title !== undefined) updateData.title = body.title;
      if (body.content !== undefined) updateData.content = body.content;
      if (body.color !== undefined) updateData.color = body.color;
      if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
      if (body.order !== undefined) updateData.order = body.order;
      if (body.reminderAt !== undefined) {
        updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt).toISOString() : null;
        if (body.reminderAt) updateData.isReminderNotified = false;
      }

      const note = await db
        .update(notes)
        .set(updateData)
        .where(eq(notes.id, id))
        .returning()
        .get();
      return NextResponse.json(note);
    } else if (body.orders) {
      // Batch update orders for drag & drop
      const updates = body.orders.map((item: { id: string; order: number }) =>
        db
          .update(notes)
          .set({ order: item.order, updatedAt: now() })
          .where(eq(notes.id, item.id))
      );
      await Promise.all(updates);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ID or orders required" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const db = await getTenantDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db
      .delete(notes)
      .where(eq(notes.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete note" }, { status: 500 });
  }
}
