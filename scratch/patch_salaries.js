import { PrismaClient } from "@prisma/client";

const masterPrisma = new PrismaClient({
  datasources: {
    db: {
      url: "mongodb+srv://muktoarifin_db_user:U0TKLqUkki2CKcjp@busniess-hr.wng4kqz.mongodb.net/saas_master?appName=busniess-hr"
    }
  }
});

async function main() {
  const tenants = await masterPrisma.tenant.findMany();
  console.log(`Checking ${tenants.length} tenants...`);

  for (const tenant of tenants) {
    console.log(`\n--- Processing Tenant: ${tenant.companyName} (${tenant.companyCode}) ---`);
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: tenant.dbUrl } }
    });

    try {
      const recordsToFix = await tenantPrisma.monthlySalary.findMany({
        where: {
          payableSalary: 0,
          totalSalary: { gt: 0 }
        }
      });

      console.log(`Found ${recordsToFix.length} zero-salary records.`);

      for (const record of recordsToFix) {
        console.log(`  Fixing record for Employee ID: ${record.employeeId}, Month: ${record.month}/${record.year}`);
        
        await tenantPrisma.monthlySalary.update({
          where: { id: record.id },
          data: {
            workingDaySalary: record.totalSalary,
            payableSalary: record.totalSalary,
            totalSalaryPaid: record.totalSalary
          }
        });
        console.log(`  Updated successfully.`);
      }
    } catch (e) {
      console.error(`Error processing tenant ${tenant.companyCode}:`, e.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  await masterPrisma.$disconnect();
}

main();
