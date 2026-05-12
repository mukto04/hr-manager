import { getPrismaBySlug } from "../src/lib/prisma";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Please provide a tenant slug.");
    process.exit(1);
  }
  const prisma = await getPrismaBySlug(slug);
  const devices = await prisma.attendanceDevice.findMany();
  console.log(JSON.stringify(devices, null, 2));
  process.exit(0);
}

main().catch(console.error);
