import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const images: Record<string, string> = {
    "SNK-WHT-001": "/products/sneakers.png",
    "TEE-ORG-004": "/products/tshirt.png",
    "AUD-WLS-003": "/products/earbuds.png",
    "BAG-BLK-002": "/products/backpack.png",
    "BTL-STL-005": "/products/bottle.png",
  };

  for (const [sku, imageUrl] of Object.entries(images)) {
    await prisma.product.update({
      where: { sku },
      data: { imageUrl },
    });
    console.log(`Updated ${sku} with ${imageUrl}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
