const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing Prisma connection...');
  try {
    await prisma.$connect();
    console.log('Connected.');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'appdevsuk' }
    });
    console.log('Result:', tenant ? tenant.companyName : 'Not found');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
