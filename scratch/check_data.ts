import { masterPrisma } from "../src/lib/prisma";

async function check() {
  const tenants = await masterPrisma.tenant.findMany();
  console.log("Tenants in DB:", JSON.stringify(tenants, null, 2));
}

check();
