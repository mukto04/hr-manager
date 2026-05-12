export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { attendanceDevices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    console.log("API: Fetching devices...");
    const db = await getTenantDb();
    console.log("API: DB resolved");
    const devices = await db
      .select()
      .from(attendanceDevices)
      .orderBy(desc(attendanceDevices.createdAt));
    console.log(`API: Found ${devices.length} devices`);
    return NextResponse.json(devices);
  } catch (error: any) {
    console.error("API GET Devices Error:", error);
    return NextResponse.json({
      message: "Failed to fetch devices",
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as any;
    const db = await getTenantDb();

    // Prevent duplicate serial numbers
    if (data.serialNumber) {
      const existing = await db
        .select()
        .from(attendanceDevices)
        .where(eq(attendanceDevices.serialNumber, data.serialNumber))
        .get();
      if (existing) {
        return NextResponse.json({ message: "Device with this serial number is already registered." }, { status: 400 });
      }
    }

    const device = await db
      .insert(attendanceDevices)
      .values({
        id: newId(),
        deviceName: data.deviceName,
        serialNumber: data.serialNumber || null,
        ipAddress: data.ipAddress || null,
        port: parseInt(data.port) || 4370,
        description: data.description || null,
        apiKey: crypto.randomUUID(),
        status: "PENDING",
        createdAt: now(),
        updatedAt: now(),
      })
      .returning()
      .get();

    return NextResponse.json(device, { status: 201 });
  } catch (error: any) {
    console.error("POST Device Error:", error);
    return NextResponse.json({ message: "Failed to create device", error: error.message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = (await request.json()) as any;
    const db = await getTenantDb();

    const device = await db
      .update(attendanceDevices)
      .set({
        deviceName: data.deviceName,
        serialNumber: data.serialNumber || null,
        ipAddress: data.ipAddress || null,
        port: parseInt(data.port) || 4370,
        description: data.description || null,
        status: data.status,
        updatedAt: now(),
      })
      .where(eq(attendanceDevices.id, data.id))
      .returning()
      .get();

    return NextResponse.json(device);
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update device", error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 });

    const db = await getTenantDb();
    await db.delete(attendanceDevices).where(eq(attendanceDevices.id, id));

    return NextResponse.json({ message: "Device deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete device", error }, { status: 400 });
  }
}
