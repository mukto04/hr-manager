const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTenants() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { slug: true }
    });
    console.log("Existing Tenants:", tenants);
  } catch (error) {
    console.error("Error listing tenants:", error);
  } finally {
    await prisma.$disconnect();
  }
}

listTenants();
