import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ message: "Slug is required" }, { status: 400 });
    }

    // Find tenant by slug
    // We also support case-insensitive lookup for better UX
    const tenant = await masterPrisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: {
        companyName: true,
        slug: true
      }
    });

    if (!tenant) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error("Tenant Resolve Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
