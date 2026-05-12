export const runtime = "edge";
import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const prisma = await getTenantPrisma();
    const body = (await request.json()) as any;
    const { title, content, image, file } = body;

    const notice = await prisma.notice.create({
      data: { title, content, image, file }
    });

    // Create notifications for all employees
    const employees = await prisma.employee.findMany({ 
      where: { status: "ACTIVE" },
      select: { id: true }
    });
    
    // MongoDB createMany support check
    await Promise.all(
      employees.map(emp => 
        prisma.notification.create({
          data: {
            employeeId: emp.id,
            title: "New Notice: " + title,
            message: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
            type: "NOTICE"
          }
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
    const prisma = await getTenantPrisma();
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(notices);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch notices" }, { status: 500 });
  }
}

