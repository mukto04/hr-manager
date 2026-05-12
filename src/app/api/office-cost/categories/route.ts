export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { costCategories, costTransactions } from "@/lib/db/schema";
import { eq, asc, count } from "drizzle-orm";

export async function GET() {
  try {
    const db = await getTenantDb();

    const categories = await db
      .select()
      .from(costCategories)
      .orderBy(asc(costCategories.name));

    // If no categories exist, seed with some defaults
    if (categories.length === 0) {
      const defaults = [
        { name: "Bazar", type: "EXPENSE", color: "#ef4444" },
        { name: "Utility Bills", type: "EXPENSE", color: "#3b82f6" },
        { name: "Rent", type: "EXPENSE", color: "#8b5cf6" },
        { name: "Income", type: "INCOME", color: "#10b981" },
        { name: "Others", type: "EXPENSE", color: "#64748b" },
      ];

      for (const d of defaults) {
        await db.insert(costCategories).values({
          id: newId(),
          name: d.name,
          type: d.type,
          color: d.color,
          createdAt: now(),
          updatedAt: now(),
        });
      }

      const freshCategories = await db
        .select()
        .from(costCategories)
        .orderBy(asc(costCategories.name));

      // Add transaction counts
      const withCounts = await Promise.all(
        freshCategories.map(async (cat) => {
          const txCount =
            (
              await db
                .select({ count: count() })
                .from(costTransactions)
                .where(eq(costTransactions.categoryId, cat.id))
                .get()
            )?.count ?? 0;
          return { ...cat, _count: { transactions: txCount } };
        })
      );

      return NextResponse.json(withCounts);
    }

    // Add transaction counts to existing categories
    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const txCount =
          (
            await db
              .select({ count: count() })
              .from(costTransactions)
              .where(eq(costTransactions.categoryId, cat.id))
              .get()
          )?.count ?? 0;
        return { ...cat, _count: { transactions: txCount } };
      })
    );

    return NextResponse.json(withCounts);
  } catch (error: any) {
    console.error("Categories Fetch Error:", error);
    return NextResponse.json({ message: "Failed to fetch categories", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const body = (await request.json()) as any;
    const { name, type, color } = body;

    if (!name) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const category = await db
      .insert(costCategories)
      .values({
        id: newId(),
        name,
        type: type || "EXPENSE",
        color: color || "#64748b",
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Category Creation Error:", error);
    return NextResponse.json(
      { message: "Failed to create category. Name might already exist.", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = await getTenantDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Category ID is required" }, { status: 400 });
    }

    // Check if it has transactions
    const txCount =
      (
        await db
          .select({ count: count() })
          .from(costTransactions)
          .where(eq(costTransactions.categoryId, id))
          .get()
      )?.count ?? 0;

    if (txCount > 0) {
      return NextResponse.json(
        { message: "Cannot delete category with existing transactions." },
        { status: 400 }
      );
    }

    await db.delete(costCategories).where(eq(costCategories.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete category", error: error.message }, { status: 500 });
  }
}
