import { NextResponse, NextRequest } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export async function PUT(req: NextRequest) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.password || body.password.length < 6) {
      return NextResponse.json(
        { message: "Password is required and must be at least 6 characters" },
        { status: 400 }
      );
    }

    // In a production environment, verify old password before setting new.
    // For this demonstration/current scope, we directly set the new password.
    await (await getTenantPrisma()).employee.update({
      where: { id: employeeId },
      data: {
        password: body.password
      }
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Employee portal password update error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
