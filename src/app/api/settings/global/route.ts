export const runtime = "edge";
import { NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await masterPrisma.masterAdmin.findFirst({
      select: {
        country: true,
        currencySymbol: true,
        timezone: true,
        language: true
      }
    });

    return NextResponse.json({
      country: config?.country || "Bangladesh",
      currencySymbol: config?.currencySymbol || "à§³",
      timezone: config?.timezone || "Asia/Dhaka",
      language: config?.language || "en"
    });
  } catch (error) {
    return NextResponse.json({ 
      country: "Bangladesh",
      currencySymbol: "à§³",
      timezone: "Asia/Dhaka",
      language: "en"
    });
  }
}

