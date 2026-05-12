const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Attempting to fetch TenantSettings...");
    const settings = await prisma.tenantSettings.findFirst();
    console.log("Settings found:", settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
