const { PrismaClient } = require('@prisma/client');

async function checkTenantDb() {
  // Hardcoded for appdevsuk based on master DB inspection (I'll guess the URL or find it)
  // Actually, I'll fetch it from master first.
  const masterPrisma = new PrismaClient();
  const tenant = await masterPrisma.tenant.findUnique({ where: { slug: 'appdevsuk' } });
  await masterPrisma.$disconnect();

  if (!tenant) {
    console.error("Tenant appdevsuk not found");
    return;
  }

  console.log("Connecting to Tenant DB:", tenant.dbUrl.split('@')[1]); // Log host only for privacy
  const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenant.dbUrl } } });

  try {
    const settings = await tenantPrisma.tenantSettings.findFirst();
    console.log("Tenant Settings found:", !!settings);
    if (settings) {
       console.log("Weekly Schedule in DB:", settings.weeklySchedule);
    }
  } catch (error) {
    console.error("Error connecting to tenant DB:", error.message);
  } finally {
    await tenantPrisma.$disconnect();
  }
}

checkTenantDb();
