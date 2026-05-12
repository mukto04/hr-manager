import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma";
import { MongoClient } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug")?.toLowerCase();

    if (!slug) {
      return NextResponse.json({ error: "Please provide a slug parameter. Example: ?slug=appdevsuk" }, { status: 400 });
    }

    // 1. Resolve DB URL from Master
    const tenant = await masterPrisma.tenant.findUnique({ where: { slug } });
    if (!tenant) return NextResponse.json({ error: `Tenant with slug '${slug}' not found in master database.` });

    const URI = tenant.dbUrl;
    
    // 3. Connect using standard MongoDB Driver for inspection
    const mongoClient = new MongoClient(URI);
    await mongoClient.connect();
    
    const admin = mongoClient.db().admin();
    const { databases } = await admin.listDatabases();
    
    const report: any[] = [];
    
    for (const dbInfo of databases) {
      const db = mongoClient.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      const stats: any = {
        database: dbInfo.name,
        collections: []
      };

      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        if (count > 0) {
            stats.collections.push({ name: coll.name, count });
        }
      }
      
      if (stats.collections.length > 0) {
        report.push(stats);
      }
    }

    await mongoClient.close();

    return NextResponse.json({
      status: "Cluster Scan Complete",
      connectedToSlug: slug,
      currentConfiguredUrl: URI.replace(/\/\/.*@/, "//****:****@"), // Mask credentials
      foundData: report,
      instruction: "Find the database with 'Employee' count > 0. Then put its name after '.net/' in Super Admin panel."
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
