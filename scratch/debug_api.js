// This script mimics the API call to check for errors
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugSettingsApi() {
  try {
    console.log("Step 1: Check Prisma Connection...");
    const count = await prisma.tenantSettings.count();
    console.log("Step 2: TenantSettings count:", count);

    console.log("Step 3: Fetching first record...");
    let settings = await prisma.tenantSettings.findFirst();
    console.log("Settings Found:", !!settings);

    if (!settings) {
       console.log("Step 4: Attempting to create default settings...");
       settings = await prisma.tenantSettings.create({
         data: {
           defaultInTime: "09:00 AM",
           defaultOutTime: "06:00 PM",
           lateThresholdTime: "09:15 AM",
           avgRequestTime: "09:00 AM",
           halfDayThreshold: 420,
           fullDayThreshold: 540
         }
       });
       console.log("Created Settings:", settings.id);
    }

    console.log("Step 5: Final settings check:", settings);

  } catch (error) {
    console.error("DEBUG API ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSettingsApi();
