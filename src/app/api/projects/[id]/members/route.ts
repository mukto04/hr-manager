export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { projects, projectMembers, employees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { employeeId, role } = (await request.json()) as any;
    const db = await getTenantDb();

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    const member = await db
      .insert(projectMembers)
      .values({
        id: newId(),
        projectId: id,
        employeeId,
        role: role || "Member",
        assignedAt: now(),
      })
      .returning()
      .get();

    // Fetch employee and project info for notification and response
    const employee = await db
      .select({ name: employees.name, designation: employees.designation })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .get();

    const project = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    // Notify the member
    await createNotification({
      employeeId,
      title: "New Project Assigned",
      message: `You have been assigned to project: ${project?.name}`,
      type: "PROJECT",
    });

    return NextResponse.json(
      {
        ...member,
        employee: {
          name: employee?.name,
          designation: employee?.designation,
        },
        project: {
          name: project?.name,
        },
      },
      { status: 201 }
    );
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
    const db = await getTenantDb();

    if (!employeeId) {
      return NextResponse.json({ message: "Employee ID is required" }, { status: 400 });
    }

    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.employeeId, employeeId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to remove member:", error);
    return NextResponse.json({ message: "Failed to remove member", error: error.message }, { status: 500 });
  }
}
