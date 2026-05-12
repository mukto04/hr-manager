export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";
import { costTransactionSchema } from "../../_helpers";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    const prisma = await getTenantPrisma();

    const transactions = await prisma.costTransaction.findMany({
      where: {
        ...(month && year ? { month, year } : {}),
      },
      include: {
        category: true,
      },
      orderBy: { date: "desc" },
    });

    // Calculate cumulative opening balance from all previous transactions
    let previousBalance = 0;
    if (month && year) {
      const allPrevTransactions = await prisma.costTransaction.findMany({
        where: {
          OR: [
            { year: { lt: year } },
            { year: year, month: { lt: month } }
          ]
        },
      });

      allPrevTransactions.forEach((t) => {
        if (t.type === "INCOME") previousBalance += t.amount;
        else previousBalance -= t.amount;
      });
    }

    return NextResponse.json({ transactions, previousBalance });
  } catch (error: any) {
    console.error("Transactions Fetch Error:", error);
    return NextResponse.json({ message: "Failed to fetch transactions", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const body = (await request.json()) as any;
    const parsed = costTransactionSchema.parse(body);

    const date = new Date(parsed.date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const transaction = await prisma.costTransaction.create({
      data: {
        ...parsed,
        date,
        month,
        year,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error("Transaction Creation Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Validation failed", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Failed to create transaction", error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const body = (await request.json()) as any;
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }

    const transaction = await prisma.costTransaction.update({
      where: { id },
      data,
      include: { category: true },
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update transaction", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }

    await prisma.costTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete transaction", error: error.message }, { status: 500 });
  }
}

