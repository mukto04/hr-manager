import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const adminConfig = await masterPrisma.masterAdmin.findFirst();
    return NextResponse.json({
      loginTitle: adminConfig?.loginTitle || "AppDevs HR Master Access",
      loginSub: adminConfig?.loginSub || "Restricted to AppDevs Administrators only.",
      country: adminConfig?.country || "Bangladesh",
      currencySymbol: adminConfig?.currencySymbol || "৳",
      timezone: adminConfig?.timezone || "Asia/Dhaka",
      language: adminConfig?.language || "en"
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { loginTitle, loginSub, country, currencySymbol, timezone, language } = await request.json();

    const adminConfig = await masterPrisma.masterAdmin.findFirst();

    if (adminConfig) {
      await masterPrisma.masterAdmin.update({
        where: { id: adminConfig.id },
        data: { 
          loginTitle: loginTitle || adminConfig.loginTitle, 
          loginSub: loginSub || adminConfig.loginSub,
          country: country || adminConfig.country,
          currencySymbol: currencySymbol || adminConfig.currencySymbol,
          timezone: timezone || adminConfig.timezone,
          language: language || adminConfig.language,
          updatedAt: new Date() 
        }
      });
    } else {
      await masterPrisma.masterAdmin.create({
        data: { 
          password: "superadmin123",
          loginTitle: loginTitle || "AppDevs HR Master Access",
          loginSub: loginSub || "Restricted to AppDevs Administrators only.",
          country: country || "Bangladesh",
          currencySymbol: currencySymbol || "৳",
          timezone: timezone || "Asia/Dhaka",
          language: language || "en",
          updatedAt: new Date()
        }
      });
    }

    return NextResponse.json({ message: "System settings updated successfully" });
  } catch (error: any) {
    console.error("System Settings Update Error:", error);
    return NextResponse.json({ message: error?.message || "Failed to update settings" }, { status: 500 });
  }
}
