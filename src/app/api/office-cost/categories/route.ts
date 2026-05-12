import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const prisma = await getTenantPrisma();
    const categories = await prisma.costCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

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
        await prisma.costCategory.create({ data: d });
      }

      const freshCategories = await prisma.costCategory.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { transactions: true } }
        }
      });
      return NextResponse.json(freshCategories);
    }

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Categories Fetch Error:", error);
    return NextResponse.json({ message: "Failed to fetch categories", error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const body = await request.json();
    const { name, type, color } = body;

    if (!name) {
      return NextResponse.json({ message: "Category name is required" }, { status: 400 });
    }

    const category = await prisma.costCategory.create({
      data: {
        name,
        type: type || "EXPENSE",
        color: color || "#64748b"
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error("Category Creation Error:", error);
    return NextResponse.json({ message: "Failed to create category. Name might already exist.", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const prisma = await getTenantPrisma();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Category ID is required" }, { status: 400 });
    }

    // Check if it has transactions
    const count = await prisma.costTransaction.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json({ message: "Cannot delete category with existing transactions." }, { status: 400 });
    }

    await prisma.costCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete category", error: error.message }, { status: 500 });
  }
}
