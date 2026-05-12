export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { costCategories, costTransactions } from "@/lib/db/schema";
import { eq, and, or, lt, desc } from "drizzle-orm";
import { costTransactionSchema } from "../../_helpers";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "");
    const year = parseInt(searchParams.get("year") || "");

    const db = await getTenantDb();

    // Build where clause
    const whereClause =
      month && year
        ? and(eq(costTransactions.month, month), eq(costTransactions.year, year))
        : undefined;

    const transactions = await db
      .select({
        id: costTransactions.id,
        date: costTransactions.date,
        month: costTransactions.month,
        year: costTransactions.year,
        amount: costTransactions.amount,
        type: costTransactions.type,
        categoryId: costTransactions.categoryId,
        details: costTransactions.details,
        createdAt: costTransactions.createdAt,
        updatedAt: costTransactions.updatedAt,
        categoryName: costCategories.name,
        categoryType: costCategories.type,
        categoryColor: costCategories.color,
      })
      .from(costTransactions)
      .leftJoin(costCategories, eq(costTransactions.categoryId, costCategories.id))
      .where(whereClause)
      .orderBy(desc(costTransactions.date));

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      date: t.date,
      month: t.month,
      year: t.year,
      amount: t.amount,
      type: t.type,
      categoryId: t.categoryId,
      details: t.details,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      category: {
        name: t.categoryName,
        type: t.categoryType,
        color: t.categoryColor,
      },
    }));

    // Calculate cumulative opening balance from all previous transactions
    let previousBalance = 0;
    if (month && year) {
      const allPrevTransactions = await db
        .select({ type: costTransactions.type, amount: costTransactions.amount })
        .from(costTransactions)
        .where(
          or(
            lt(costTransactions.year, year),
            and(eq(costTransactions.year, year), lt(costTransactions.month, month))
          )
        );

      allPrevTransactions.forEach((t) => {
        if (t.type === "INCOME") previousBalance += t.amount;
        else previousBalance -= t.amount;
      });
    }

    return NextResponse.json({ transactions: formattedTransactions, previousBalance });
  } catch (error: any) {
    console.error("Transactions Fetch Error:", error);
    return NextResponse.json({ message: "Failed to fetch transactions", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const body = (await request.json()) as any;
    const parsed = costTransactionSchema.parse(body);

    const dateStr = typeof parsed.date === "string" ? parsed.date : (parsed.date as Date).toISOString();
    const dateObj = new Date(dateStr);
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const transaction = await db
      .insert(costTransactions)
      .values({
        id: newId(),
        date: dateStr,
        month,
        year,
        amount: parsed.amount,
        type: parsed.type,
        categoryId: parsed.categoryId,
        details: parsed.details ?? null,
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    // Fetch the category for the response
    const category = await db
      .select()
      .from(costCategories)
      .where(eq(costCategories.id, parsed.categoryId))
      .get();

    return NextResponse.json({ ...transaction, category }, { status: 201 });
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
    const db = await getTenantDb();
    const body = (await request.json()) as any;
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }

    const transaction = await db
      .update(costTransactions)
      .set({ ...data, updatedAt: now() })
      .where(eq(costTransactions.id, id))
      .returning()
      .get();

    // Fetch the category for the response
    const category = transaction?.categoryId
      ? await db
          .select()
          .from(costCategories)
          .where(eq(costCategories.id, transaction.categoryId))
          .get()
      : null;

    return NextResponse.json({ ...transaction, category });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update transaction", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }

    await db.delete(costTransactions).where(eq(costTransactions.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete transaction", error: error.message }, { status: 500 });
  }
}
