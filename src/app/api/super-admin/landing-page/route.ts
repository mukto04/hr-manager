export const runtime = "edge";
import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const content = await masterPrisma.landingPageContent.findMany();
    
    // Convert array to a section-keyed object for easier consumption
    const keyedContent = content.reduce((acc, item) => {
      acc[item.section] = item.content;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json(keyedContent);
  } catch (error: any) {
    console.error("Super Admin Landing Fetch Error:", error);
    return NextResponse.json({ message: "Failed to fetch content" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { section, content } = (await request.json()) as any;

    if (!section || !content) {
      return NextResponse.json({ message: "Section and content are required" }, { status: 400 });
    }

    const updated = await masterPrisma.landingPageContent.upsert({
      where: { section },
      update: { 
        content,
        updatedAt: new Date()
      },
      create: { 
        section, 
        content 
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Landing Page Content Update Error:", error);
    return NextResponse.json({ 
      message: "Failed to update content", 
      error: error.message 
    }, { status: 500 });
  }
}

