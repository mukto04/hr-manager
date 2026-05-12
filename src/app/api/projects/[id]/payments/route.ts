export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { projectPayments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getTenantDb();

    const payments = await db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.projectId, id))
      .orderBy(desc(projectPayments.date));

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
    const data = (await request.json()) as any;
    const db = await getTenantDb();

    if (!data.amount) {
      return NextResponse.json({ message: "Amount is required" }, { status: 400 });
    }

    const payment = await db
      .insert(projectPayments)
      .values({
        id: newId(),
        projectId: id,
        amount: parseFloat(data.amount),
        date: data.date ? data.date : now(),
        method: data.method || "Bank",
        reference: data.reference || null,
        note: data.note || null,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add payment:", error);
    return NextResponse.json({ message: "Failed to add payment", error: error.message }, { status: 500 });
  }
}
