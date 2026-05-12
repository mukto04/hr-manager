import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { getEmployeeIdFromSession } from "@/lib/employee-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const employeeId = await getEmployeeIdFromSession();
    if (!employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const prisma = await getTenantPrisma();
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { members: { some: { employeeId } } },
          { projectManagerId: employeeId }
        ]
      },
      include: {
        _count: {
          select: {
            members: true,
            payments: true
          }
        },
        members: true
      },
      orderBy: { updatedAt: "desc" }
    });

    // Transform to mock memberships for frontend compatibility
    const memberships = projects.map(p => {
      const myMembership = p.members.find((m: any) => m.employeeId === employeeId);
      return {
        id: myMembership?.id || `pm-${p.id}`,
        projectId: p.id,
        employeeId,
        role: myMembership?.role || "Project Manager",
        assignedAt: myMembership?.assignedAt || p.createdAt,
        project: p
      };
    });

    return NextResponse.json(memberships);
  } catch (error: any) {
    console.error("Failed to fetch employee projects:", error);
    return NextResponse.json({ message: "Failed to fetch projects", error: error.message }, { status: 500 });
  }
}
