import { PrismaClient } from "@prisma/client";

const masterPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "mongodb+srv://muktoarifin_db_user:U0TKLqUkki2CKcjp@busniess-hr.wng4kqz.mongodb.net/saas_master?appName=busniess-hr"
    }
  }
});

async function main() {
  const tenant = await masterPrisma.tenant.findUnique({
    where: { companyCode: "AD1" }
  });
  
  if (!tenant) {
    console.log("Tenant AD1 not found.");
    return;
  }

  console.log("Tenant DB URL:", tenant.dbUrl);

  const tenantPrisma = new PrismaClient({
    datasources: {
      db: {
        url: tenant.dbUrl
      }
    }
  });

  try {
    const employee = await tenantPrisma.employee.findUnique({
      where: { employeeCode: "ADENAM0310" }
    });
    console.log("Employee Status:", employee ? "Found" : "Not Found");
    if (employee) {
      console.log("Designation:", employee.designation);
    }
  } catch (e) {
    console.error("Error connecting to tenant DB:", e);
  } finally {
    await tenantPrisma.$disconnect();
    await masterPrisma.$disconnect();
  }
}

main();
