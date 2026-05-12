const { PrismaClient } = require("@prisma/client");

async function checkProjects() {
  const prisma = new PrismaClient();
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { members: true } } }
    });
    console.log("Latest Projects:", JSON.stringify(projects, null, 2));
  } catch (err) {
    console.error("Error checking projects:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkProjects();
