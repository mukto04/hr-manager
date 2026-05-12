export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { employeeId, role } = (await request.json()) as any;
    const prisma = await getTenantPrisma();

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId: id,
        employeeId,
        role: role || "Member"
      },
      include: {
        employee: {
          select: {
            name: true,
            designation: true
          }
        },
        project: {
          select: {
            name: true
          }
        }
      }
    });

    // Notify the member
    await createNotification({
      employeeId,
      title: "New Project Assigned",
      message: `You have been assigned to project: ${member.project.name}`,
      type: "PROJECT"
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ message: "Failed to add member", error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const prisma = await getTenantPrisma();

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    await prisma.projectMember.delete({
      where: {
        projectId_employeeId: {
          projectId: id,
          employeeId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ message: "Failed to remove member", error: error.message }, { status: 500 });
  }
}
