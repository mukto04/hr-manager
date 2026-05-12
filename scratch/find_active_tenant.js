
const { PrismaClient } = require('@prisma/client');
const masterPrisma = new PrismaClient();

async function main() {
  const tenants = await masterPrisma.tenant.findMany();
  for (const t of tenants) {
    console.log(`Checking tenant: ${t.slug} (${t.companyName})`);
    try {
      const prisma = new PrismaClient({ datasources: { db: { url: t.dbUrl } } });
      const noteCount = await prisma.note.count();
      const notifCount = await prisma.notification.count();
      console.log(`  Notes: ${noteCount}, Notifications: ${notifCount}`);
      if (noteCount > 0) {
        const latestNote = await prisma.note.findFirst({ orderBy: { createdAt: 'desc' } });
        console.log(`  Latest Note: ${latestNote.title} (Reminder: ${latestNote.reminderAt}, Notified: ${latestNote.isReminderNotified})`);
      }
      await prisma.$disconnect();
    } catch (e) {
      console.log(`  Failed to connect: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
