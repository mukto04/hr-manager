import { PrismaClient } from "@prisma/client";

const masterPrisma = new PrismaClient({
  datasources: {
    db: { url: "mongodb+srv://muktoarifin_db_user:U0TKLqUkki2CKcjp@busniess-hr.wng4kqz.mongodb.net/saas_master?appName=busniess-hr" }
  }
});

async function checkTenants() {
  try {
    console.log("--- Master Database Tenants ---");
    const tenants = await masterPrisma.tenant.findMany();
    tenants.forEach(t => {
      console.log(`Company: ${t.companyName}`);
      console.log(`Slug: ${t.slug}`);
      console.log(`DB URL: ${t.dbUrl}`);
      console.log('---------------------------');
    });
  } catch (err) {
    console.error("Error fetching tenants:", err);
  } finally {
    await masterPrisma.$disconnect();
  }
}

checkTenants();
