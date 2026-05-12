export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const db = await getTenantDb();

    // Find all projects where the employee is a member
    const memberships = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.employeeId, employeeId));

    const memberProjectIds = memberships.map(m => m.projectId);

    // Get all projects where employee is a member OR is the project manager
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));

    // Filter: member of project OR project manager
    const filteredProjects = allProjects.filter(
      p => memberProjectIds.includes(p.id) || p.projectManagerId === employeeId
    );

    // For each project, fetch all members
    const result = await Promise.all(
      filteredProjects.map(async (p) => {
        const members = await db
          .select()
          .from(projectMembers)
          .where(eq(projectMembers.projectId, p.id));

        const myMembership = members.find(m => m.employeeId === employeeId);

        return {
          id: myMembership?.id || `pm-${p.id}`,
          projectId: p.id,
          employeeId,
          role: myMembership?.role || "Project Manager",
          assignedAt: myMembership?.assignedAt || p.createdAt,
          project: { ...p, members }
        };
      })
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Failed to fetch employee projects:", error);
    return NextResponse.json({ message: "Failed to fetch projects", error: error.message }, { status: 500 });
  }
}
