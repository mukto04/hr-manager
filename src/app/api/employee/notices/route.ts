import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = await getTenantPrisma();
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: "desc" },
      take: 5 // Get latest 5 notices
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error("Notices API error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
