export const runtime = "edge";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { masterAdmins } from "@/lib/db/schema";

export async function GET() {
  try {
    const config = await getDb()
      .select({
        country: masterAdmins.country,
        currencySymbol: masterAdmins.currencySymbol,
        timezone: masterAdmins.timezone,
        language: masterAdmins.language,
      })
      .from(masterAdmins)
      .limit(1)
      .get();

    return NextResponse.json({
      country: config?.country || "Bangladesh",
      currencySymbol: config?.currencySymbol || "৳",
      timezone: config?.timezone || "Asia/Dhaka",
      language: config?.language || "en",
    });
  } catch (error) {
    return NextResponse.json({
      country: "Bangladesh",
      currencySymbol: "৳",
      timezone: "Asia/Dhaka",
      language: "en",
    });
  }
}
