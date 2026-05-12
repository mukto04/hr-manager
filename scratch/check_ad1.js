import { PrismaClient } from "@prisma/client";

const masterPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "mongodb+srv://muktoarifin_db_user:U0TKLqUkki2CKcjp@busniess-hr.wng4kqz.mongodb.net/saas_master?appName=busniess-hr"
    }
  }
});

async function main() {
  console.log("Fetching credentials for AD1...");
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { companyCode: "AD1" }
    });
    if (tenant) {
      console.log("Tenant Found!");
      console.log("Username:", tenant.adminUsername);
      console.log("Password:", tenant.adminPassword);
    } else {
      console.log("Tenant AD1 not found.");
    }
  } catch (e) {
    console.error("Error connecting to DB:", e);
  } finally {
    await masterPrisma.$disconnect();
  }
}

main();
