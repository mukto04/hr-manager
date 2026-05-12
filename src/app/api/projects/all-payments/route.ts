export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const payments = await prisma.projectPayment.findMany({
      include: {
        project: {
          select: {
            name: true,
            id: true
          }
        }
      },
      orderBy: { date: "desc" }
    });

    const formattedPayments = payments.map(p => ({
      ...p,
      projectName: p.project.name,
      projectId: p.project.id
    }));

    return NextResponse.json(formattedPayments);
  } catch (error: any) {
    console.error("Failed to fetch all payments:", error);
    return NextResponse.json({ message: "Failed to fetch all payments", error: error.message }, { status: 500 });
  }
}

