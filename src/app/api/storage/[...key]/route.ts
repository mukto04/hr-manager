import { NextResponse, type NextRequest } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyArray } = await params;
    const key = keyArray.join("/");
    // @ts-ignore
    const { env } = getRequestContext();
    const storage = env.STORAGE;

    if (!storage) {
      return new NextResponse("Storage binding not found", { status: 500 });
    }

    const object = await storage.get(key);

    if (!object) {
      return new NextResponse("File not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);

    return new NextResponse(object.body, {
      headers,
    });
  } catch (error) {
    console.error("R2 Get Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
