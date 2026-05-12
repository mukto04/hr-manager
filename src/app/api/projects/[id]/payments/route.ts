import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prisma = await getTenantPrisma();
    const payments = await prisma.projectPayment.findMany({
      where: { projectId: id },
      orderBy: { date: "desc" }
    });

    return NextResponse.json(payments);
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json({ message: "Failed to fetch payments", error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const prisma = await getTenantPrisma();

    if (!data.amount) {
      return NextResponse.json({ message: "Amount is required" }, { status: 400 });
    }

    const payment = await prisma.projectPayment.create({
      data: {
        projectId: id,
        amount: parseFloat(data.amount),
        date: data.date ? new Date(data.date) : new Date(),
        method: data.method || "Bank",
        reference: data.reference || null,
        note: data.note || null
      }
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add payment:", error);
    return NextResponse.json({ message: "Failed to add payment", error: error.message }, { status: 500 });
  }
}
