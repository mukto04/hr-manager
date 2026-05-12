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

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: tenant.dbUrl } }
  });

  try {
    const employee = await tenantPrisma.employee.findUnique({
      where: { employeeCode: "ADENAM0310" },
      include: {
        salaryStructure: true,
        monthlySalaries: {
          where: { month: 4, year: 2026 }
        }
      }
    });

    if (!employee) {
      console.log("Employee ADENAM0310 not found.");
      return;
    }

    console.log("Salary Structure:", JSON.stringify(employee.salaryStructure, null, 2));
    console.log("Monthly Salary Record (April 2026):", JSON.stringify(employee.monthlySalaries[0], null, 2));

  } catch (e) {
    console.error("Error:", e);
  } finally {
    await tenantPrisma.$disconnect();
    await masterPrisma.$disconnect();
  }
}

main();
