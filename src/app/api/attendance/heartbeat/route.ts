export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getDbBySlug, getTenantDb, now } from "@/lib/db";
import { attendanceDevices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ message: "API Key is required" }, { status: 401 });
    }

    const { machineStatus } = (await request.json()) as any;

    let tenantSlug = request.headers.get("x-tenant-slug");
    if (tenantSlug && tenantSlug.endsWith("-hr")) {
      tenantSlug = tenantSlug.replace("-hr", "");
    }

    let db;
    try {
      if (tenantSlug && !['default', 'attendance', 'undefined', ''].includes(tenantSlug)) {
        db = await getDbBySlug(tenantSlug);
      } else {
        db = await getTenantDb();
      }
    } catch (e) {
      // Final fallback for local development without multi-tenancy active
      db = getDb();
    }

    // Find the device
    const device = await db
      .select()
      .from(attendanceDevices)
      .where(eq(attendanceDevices.apiKey, apiKey))
      .get();

    if (!device) {
      return NextResponse.json({ message: "Invalid API Key" }, { status: 401 });
    }

    // Update lastSeen and potentially status
    await db
      .update(attendanceDevices)
      .set({
        lastSeen: now(),
        status: machineStatus === "CONNECTED" ? "ACTIVE" : "DISCONNECTED",
        updatedAt: now(),
      })
      .where(eq(attendanceDevices.id, device.id));

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
