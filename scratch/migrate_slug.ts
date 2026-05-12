import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting slug migration...");
  try {
    // Since this is MongoDB, we can use raw collection access or just iterate
    // But since I changed the schema, Prisma might complain.
    // I'll use raw command to rename the field across all documents.
    
    // @ts-ignore
    const result = await prisma.$runCommandRaw({
      update: "Tenant",
      updates: [
        {
          q: { companyCode: { $exists: true } },
          u: { $rename: { companyCode: "slug" } },
          multi: true
        }
      ]
    });

    console.log("Migration result:", result);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
