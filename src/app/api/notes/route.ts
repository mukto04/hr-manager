export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = await getTenantPrisma();
    const notes = await prisma.note.findMany({
      orderBy: [
        { isPinned: "desc" },
        { order: "asc" },
        { createdAt: "desc" }
      ]
    });
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const prisma = await getTenantPrisma();
    const body = await req.json();
    
    // Get highest order to append to end
    const lastNote = await prisma.note.findFirst({
      orderBy: { order: "desc" }
    });
    const nextOrder = (lastNote?.order || 0) + 1;

    const note = await prisma.note.create({
      data: {
        title: body.title,
        content: body.content,
        color: body.color || "white",
        isPinned: body.isPinned || false,
        reminderAt: body.reminderAt ? new Date(body.reminderAt) : null,
        isReminderNotified: false,
        order: nextOrder
      }
    });
    return NextResponse.json(note);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const prisma = await getTenantPrisma();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const body = await req.json();

    if (id) {
      // Update specific note
      const note = await prisma.note.update({
        where: { id },
        data: {
          title: body.title,
          content: body.content,
          color: body.color,
          isPinned: body.isPinned,
          reminderAt: body.reminderAt ? new Date(body.reminderAt) : (body.reminderAt === null ? null : undefined),
          isReminderNotified: body.reminderAt ? false : undefined,
          order: body.order
        }
      });
      return NextResponse.json(note);
    } else if (body.orders) {
      // Batch update orders for drag & drop
      const updates = body.orders.map((item: { id: string, order: number }) => 
        prisma.note.update({
          where: { id: item.id },
          data: { order: item.order }
        })
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
    const prisma = await getTenantPrisma();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete note" }, { status: 500 });
  }
}

