import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

/**
 * Extracts the database name from a MongoDB connection string.
 * Valid format: mongodb+srv://user:pass@cluster.net/DATABASE_NAME?params
 */
function extractDbName(url: string): string | null {
  try {
    // Match the path segment between the last "/" before "?" and "?"
    const match = url.match(/\.net\/([^?/]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;
  try {
    const { dbUrl } = await request.json();

    if (!dbUrl || typeof dbUrl !== "string") {
      return NextResponse.json({ message: "Missing or invalid connection string." }, { status: 400 });
    }

    // Validate database name exists in URL
    const dbName = extractDbName(dbUrl);
    if (!dbName) {
      return NextResponse.json({ 
        message: "⚠️ Database name missing! Add database name after .net/ — e.g.: .../company_hr?appName=..." 
      }, { status: 400 });
    }

    client = new MongoClient(dbUrl, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    await client.connect();
    // Ping with the specific database
    await client.db(dbName).command({ ping: 1 });

    return NextResponse.json({ 
      message: `✓ Connection successful! Database "${dbName}" is reachable.` 
    }, { status: 200 });
  } catch (error: any) {
    console.error("DB test error:", error.message);
    const msg = error.message?.split("\n")[0] || "Unknown error";
    return NextResponse.json(
      { message: `Connection failed: ${msg}` },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close().catch(() => {});
    }
  }
}
