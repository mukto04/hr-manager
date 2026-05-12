import { NextResponse, NextRequest } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { message: "Password is required and must be at least 6 characters" },
        { status: 400 }
      );
    }

    const employee = await (await getTenantPrisma()).employee.update({
      where: { id },
      data: {
        password: body.password
      }
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Employee password update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
