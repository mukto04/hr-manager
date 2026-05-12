export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, newId, now } from "@/lib/db";
import { tenantSettings } from "@/lib/db/schema";

export async function GET() {
  try {
    const db = await getTenantDb();

    // Fetch settings (single record)
    let settings = await db.select().from(tenantSettings).limit(1).get();

    console.log(`[API Settings] Fetching settings for tenant. Found: ${!!settings}`);

    if (!settings) {
      console.log("[API Settings] No settings found, creating defaults...");
      settings = await db
        .insert(tenantSettings)
        .values({
          id: "1",
          defaultInTime: "09:00 AM",
          defaultOutTime: "06:00 PM",
          lateThresholdTime: "09:15 AM",
          avgRequestTime: "09:00 AM",
          halfDayThreshold: 420,
          fullDayThreshold: 540,
          autoLeaveDeduction: true,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning()
        .get();
    }

    // Explicitly return fields to avoid serialization issues
    const responseData = {
      id: settings!.id,
      defaultInTime: settings!.defaultInTime || "09:00 AM",
      defaultOutTime: settings!.defaultOutTime || "06:00 PM",
      lateThresholdTime: settings!.lateThresholdTime || "09:15 AM",
      avgRequestTime: settings!.avgRequestTime || "09:00 AM",
      halfDayThreshold: settings!.halfDayThreshold || 420,
      fullDayThreshold: settings!.fullDayThreshold || 540,
      weeklySchedule: settings!.weeklySchedule || [],
      salaryStructure: settings!.salaryStructure || {
        basic: { label: "Basic Salary", percent: 50 },
        hra: { label: "H.R.A", percent: 25 },
        medical: { label: "M.A", percent: 12.5 },
        travel: { label: "T.A", percent: 5 },
        others: { label: "Others", percent: 7.5 },
      },
      employeeFieldsConfig: settings!.employeeFieldsConfig || {
        visible: [
          "fingerprintId",
          "email",
          "phone",
          "bloodGroup",
          "guardianName",
          "guardianRelation",
          "guardianPhone",
          "nidNumber",
          "educationStatus",
        ],
        mandatory: ["name", "employeeCode", "designation", "joiningDate", "dateOfBirth"],
      },
      customFields: settings!.customFields || [],
      autoLeaveDeduction: settings!.autoLeaveDeduction ?? true,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Fetch Settings CRITICAL Error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    return NextResponse.json(
      {
        message: "Failed to fetch attendance settings",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const {
      defaultInTime,
      defaultOutTime,
      lateThresholdTime,
      avgRequestTime,
      googleSheetUrl,
      halfDayThreshold,
      fullDayThreshold,
      weeklySchedule,
      salaryStructure,
      employeeFieldsConfig,
      customFields,
      autoLeaveDeduction,
    } = (await request.json()) as any;

    const db = await getTenantDb();

    if (!defaultInTime || !defaultOutTime || !avgRequestTime) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const updateData = {
      defaultInTime,
      defaultOutTime,
      lateThresholdTime,
      avgRequestTime,
      googleSheetUrl,
      halfDayThreshold: parseInt(String(halfDayThreshold || 420)),
      fullDayThreshold: parseInt(String(fullDayThreshold || 540)),
      weeklySchedule,
      salaryStructure,
      employeeFieldsConfig,
      customFields,
      autoLeaveDeduction: Boolean(autoLeaveDeduction ?? true),
      updatedAt: now(),
    };

    // Upsert: single settings record with id "1"
    const settings = await db
      .insert(tenantSettings)
      .values({
        id: "1",
        ...updateData,
        createdAt: now(),
      })
      .onConflictDoUpdate({
        target: tenantSettings.id,
        set: updateData,
      })
      .returning()
      .get();

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Update Settings Error:", error);
    return NextResponse.json(
      {
        message: "Failed to update attendance settings",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
