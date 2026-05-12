import { NextRequest, NextResponse } from "next/server";
import { getPrismaBySlug } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { slug, code } = await params;

    if (!slug || !code) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    const prisma = await getPrismaBySlug(slug);
    
    const employee = await prisma.employee.findUnique({
      where: { employeeCode: code },
      select: {
        name: true,
        image: true
      }
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Public Avatar API Error:", error);
    return NextResponse.json({ message: "Connection failed" }, { status: 500 });
  }
}
