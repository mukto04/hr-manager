
const { PrismaClient } = require('@prisma/client');

async function main() {
  // Use the connection string from check_tenants output for appdevsuk
  // Wait, I need the dbUrl for appdevsuk.
  const masterPrisma = new PrismaClient();
  const tenant = await masterPrisma.tenant.findUnique({ where: { slug: 'appdevsuk' } });
  
  if (!tenant) {
    console.log('Tenant appdevsuk not found');
    return;
  }
  
  const prisma = new PrismaClient({ datasources: { db: { url: tenant.dbUrl } } });
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Notes:', JSON.stringify(notes, null, 2));
  
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Notifications:', JSON.stringify(notifications, null, 2));
  
  await prisma.$disconnect();
  await masterPrisma.$disconnect();
}

main().catch(console.error);
