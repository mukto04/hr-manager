export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ message: "Slug is required" }, { status: 400 });
    }

    // Find tenant by slug (case-insensitive)
    const tenant = await getDb()
      .select({
        companyName: tenants.companyName,
        slug: tenants.slug
      })
      .from(tenants)
      .where(eq(tenants.slug, slug.toLowerCase()))
      .get();

    if (!tenant) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Tenant Resolve Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
