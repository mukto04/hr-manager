const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTenantDb() {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'appdevsuk-hr' }
    });
    console.log("Tenant Record:", tenant);
  } catch (error) {
    console.error("Error finding tenant:", error);
  } finally {
    await prisma.$disconnect();
  }
}

findTenantDb();
