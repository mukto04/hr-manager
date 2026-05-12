import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    
    // Ensure filename is safe
    const originalName = file.name || "unnamed";
    const filename = `notices/${Date.now()}-${originalName.replace(/\s+/g, "_")}`;

    // @ts-ignore
    const { env } = getRequestContext();
    const storage = env.STORAGE;

    if (!storage) {
      return NextResponse.json({ message: "Storage binding not found" }, { status: 500 });
    }

    const fileUrl = await uploadToR2(filename, arrayBuffer, file.type, storage);
    
    return NextResponse.json({ 
      message: "File uploaded successfully", 
      url: fileUrl 
    });
  } catch (error: any) {
    console.error("Notice Upload Error:", error);
    return NextResponse.json({ 
      message: "Failed to upload file", 
      error: error.message 
    }, { status: 500 });
  }
}
