export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb } from "@/lib/db";
import { projects, projectPayments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const db = await getTenantDb();

    const payments = await db
      .select({
        id: projectPayments.id,
        projectId: projectPayments.projectId,
        amount: projectPayments.amount,
        date: projectPayments.date,
        method: projectPayments.method,
        reference: projectPayments.reference,
        note: projectPayments.note,
        createdAt: projectPayments.createdAt,
        updatedAt: projectPayments.updatedAt,
        projectName: projects.name,
      })
      .from(projectPayments)
      .leftJoin(projects, eq(projectPayments.projectId, projects.id))
      .orderBy(desc(projectPayments.date));

    const formattedPayments = payments.map((p) => ({
      ...p,
      projectName: p.projectName,
      projectId: p.projectId,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error: any) {
    console.error("Failed to fetch all payments:", error);
    return NextResponse.json({ message: "Failed to fetch all payments", error: error.message }, { status: 500 });
  }
}
