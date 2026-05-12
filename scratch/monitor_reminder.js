
const { PrismaClient } = require('@prisma/client');
const masterPrisma = new PrismaClient();

async function main() {
  const tenant = await masterPrisma.tenant.findUnique({ where: { slug: 'appdevsuk' } });
  const prisma = new PrismaClient({ datasources: { db: { url: tenant.dbUrl } } });
  
  console.log('Waiting 90 seconds for 12:13 PM reminder to fire...');
  await new Promise(r => setTimeout(r, 90000));
  
  const notes = await prisma.note.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
  const notifs = await prisma.notification.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  
  console.log('Note reminder status:', JSON.stringify(notes.map(n => ({ 
    title: n.title, 
    reminderAt: n.reminderAt, 
    isReminderNotified: n.isReminderNotified 
  })), null, 2));
  
  console.log('Latest Notifications:', JSON.stringify(notifs.map(n => ({ 
    title: n.title, 
    message: n.message, 
    createdAt: n.createdAt 
  })), null, 2));
  
  await prisma.$disconnect();
  await masterPrisma.$disconnect();
}

main().catch(console.error);
