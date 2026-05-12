export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ message: "API Key is required" }, { status: 401 });
    }

    const { machineStatus, error } = await request.json();

    let tenantSlug = request.headers.get("x-tenant-slug");
    if (tenantSlug && tenantSlug.endsWith("-hr")) {
       tenantSlug = tenantSlug.replace("-hr", "");
    }
    
    let prisma;
    
    try {
        if (tenantSlug && !['default', 'attendance', 'undefined', ''].includes(tenantSlug)) {
            const { getPrismaBySlug } = await import("@/lib/prisma");
            prisma = await getPrismaBySlug(tenantSlug);
        } else {
            prisma = await getTenantPrisma();
        }
    } catch (e) {
        // Final fallback for local development without multi-tenancy active
        const { masterPrisma } = await import("@/lib/prisma");
        prisma = masterPrisma;
    }

    // Find the device
    const device = await prisma.attendanceDevice.findUnique({
      where: { apiKey }
    });

    if (!device) {
      return NextResponse.json({ message: "Invalid API Key" }, { status: 401 });
    }

    // Update lastSeen and potentially status
    // If machineStatus is provided, we can use it to distinguish between agent status and machine status
    await prisma.attendanceDevice.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        status: machineStatus === "CONNECTED" ? "ACTIVE" : "DISCONNECTED"
      }
    });

    return NextResponse.json({ 
      message: "Heartbeat received",
      agentStatus: "ONLINE",
      machineStatus: machineStatus || "UNKNOWN"
    });

  } catch (error: any) {
    console.error("Heartbeat Error:", error);
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}

