import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, content, image, file } = body;

    const prisma = await getTenantPrisma();
    const notice = await prisma.notice.update({
      where: { id },
      data: { title, content, image, file }
    });

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
    const prisma = await getTenantPrisma();
    
    await prisma.notice.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notice Delete Error:", error);
    return NextResponse.json({ message: error.message || "Failed to delete notice" }, { status: 500 });
  }
}
