import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("Super Admin: Fetching companies...");
    const tenants = await masterPrisma.tenant.findMany({
      orderBy: { createdAt: "desc" }
    });
    console.log(`Super Admin: Found ${tenants?.length || 0} companies.`);
    return NextResponse.json(tenants || []);
  } catch (error: any) {
    console.error("Super Admin Fetch Error:", error);
    return NextResponse.json({ 
      message: "Failed to fetch tenants", 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, companyName, dbUrl, adminUsername, adminPassword, subscriptionDays, planName, employeeLimit } = body;

    if (!slug || !companyName || !dbUrl || !adminUsername || !adminPassword) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Default to 30 days if not provided
    const days = parseInt(subscriptionDays) || 30;
    const subscriptionStart = new Date();
    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + days);

    // Default Full Permissions for new tenants
    const defaultPermissions = {
      attendance: true,
      leaves: true,
      payroll: true,
      loans: true,
      advances: true,
      costs: true
    };

    // Employee limits based on plan
    const limits: Record<string, number> = {
      Starter: 50,
      Growth: 500,
      Enterprise: 5000
    };

    const tenant = await masterPrisma.tenant.create({
      data: {
        slug: slug.toLowerCase().trim().replace(/\s+/g, "-"),
        companyName,
        dbUrl: dbUrl.trim(),
        adminUsername,
        adminPassword,
        subscriptionStart,
        subscriptionEnd,
        planName: planName || "Starter",
        employeeLimit: employeeLimit || limits[planName as string] || 50,
        permissions: defaultPermissions,
        status: "ACTIVE"
      }
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error: any) {
    console.error("Tenant Creation Error:", error);
    return NextResponse.json({ 
      message: `Failed to create tenant. ${error.message || "Unknown error"}. Maybe the URL slug already exists?` 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Super Admin PUT Request Body:", JSON.stringify(body, null, 2));
    const { id, subscriptionDays, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: "Missing tenant ID" }, { status: 400 });
    }

    // Sanitize data (remove nulls/undefined for Prisma update if needed)
    const updateData: any = { ...data };

    // Renewal logic: if subscriptionDays is provided, add to existing end date or start from now if expired
    if (subscriptionDays) {
      const daysToAdd = parseInt(subscriptionDays);
      
      if (daysToAdd > 0) {
        const currentTenant = await masterPrisma.tenant.findUnique({ where: { id } });
        
        if (currentTenant) {
          let newEnd = new Date();
          // If current end date is in the future, add to it. Otherwise, start from now.
          if (currentTenant.subscriptionEnd && new Date(currentTenant.subscriptionEnd) > new Date()) {
            newEnd = new Date(currentTenant.subscriptionEnd);
          }
          newEnd.setDate(newEnd.getDate() + daysToAdd);
          updateData.subscriptionEnd = newEnd;
          updateData.status = "ACTIVE"; // Automatically unfreeze on renewal
        }
      }
    }

    const tenant = await masterPrisma.tenant.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(tenant);
  } catch (error: any) {
    console.error("Tenant Update Error:", error);
    return NextResponse.json({ 
      message: `Failed to update tenant. ${error.message || "Unknown error"}` 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "Missing tenant ID" }, { status: 400 });
    }

    await masterPrisma.tenant.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Tenant permanently removed." });
  } catch (error) {
    return NextResponse.json({ message: "Failed to permanently delete tenant" }, { status: 500 });
  }
}

