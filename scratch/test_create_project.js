const { PrismaClient } = require("@prisma/client");

async function testCreate() {
  const prisma = new PrismaClient();
  try {
    const project = await prisma.project.create({
      data: {
        name: "Test Project via Script",
        type: "Development",
        status: "PLANNED",
        totalAmount: 1000,
        startDate: new Date(),
        endDate: new Date()
      }
    });
    console.log("Success! Project Created:", project.id);
  } catch (err) {
    console.error("Failed to create project:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
