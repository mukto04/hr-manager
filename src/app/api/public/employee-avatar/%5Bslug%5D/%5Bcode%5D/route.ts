export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDbBySlug } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<any> }
) {
  try {
    const { slug, code } = await params;

    if (!slug || !code) {
      return NextResponse.json({ message: "Invalid parameters" }, { status: 400 });
    }

    const db = await getDbBySlug(slug);

    const employee = await db
      .select({
        name: employees.name,
        image: employees.image
      })
      .from(employees)
      .where(eq(employees.employeeCode, code))
      .get();

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Public Avatar API Error:", error);
    return NextResponse.json({ message: "Connection failed" }, { status: 500 });
  }
}
