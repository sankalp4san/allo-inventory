import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "Mumbai Central",
        location: "Mumbai, Maharashtra",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Delhi NCR Hub",
        location: "Gurugram, Haryana",
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Bangalore South",
        location: "Bengaluru, Karnataka",
      },
    }),
  ]);

  console.log(`✅ Created ${warehouses.length} warehouses`);

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Classic White Sneakers",
        sku: "SNK-WHT-001",
        description:
          "Premium leather sneakers with cushioned sole. Perfect for everyday wear.",
        price: 4999,
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Urban Black Backpack",
        sku: "BAG-BLK-002",
        description:
          "Water-resistant urban backpack with laptop compartment and USB charging port.",
        price: 2499,
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Wireless Earbuds Pro",
        sku: "AUD-WLS-003",
        description:
          "Active noise cancelling earbuds with 36-hour battery life and premium sound.",
        price: 7999,
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Organic Cotton T-Shirt",
        sku: "TEE-ORG-004",
        description:
          "100% organic cotton crew-neck tee. Pre-shrunk, sustainably sourced.",
        price: 1299,
        imageUrl: null,
      },
    }),
    prisma.product.create({
      data: {
        name: "Stainless Steel Water Bottle",
        sku: "BTL-STL-005",
        description:
          "Double-wall vacuum insulated. Keeps drinks cold 24hrs or hot 12hrs.",
        price: 899,
        imageUrl: null,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create stock levels — distribute stock across warehouses
  const stockData = [
    // Classic White Sneakers
    { productId: products[0].id, warehouseId: warehouses[0].id, totalUnits: 25 },
    { productId: products[0].id, warehouseId: warehouses[1].id, totalUnits: 15 },
    { productId: products[0].id, warehouseId: warehouses[2].id, totalUnits: 10 },

    // Urban Black Backpack
    { productId: products[1].id, warehouseId: warehouses[0].id, totalUnits: 40 },
    { productId: products[1].id, warehouseId: warehouses[1].id, totalUnits: 30 },
    { productId: products[1].id, warehouseId: warehouses[2].id, totalUnits: 20 },

    // Wireless Earbuds Pro
    { productId: products[2].id, warehouseId: warehouses[0].id, totalUnits: 8 },
    { productId: products[2].id, warehouseId: warehouses[1].id, totalUnits: 5 },
    { productId: products[2].id, warehouseId: warehouses[2].id, totalUnits: 3 },

    // Organic Cotton T-Shirt
    { productId: products[3].id, warehouseId: warehouses[0].id, totalUnits: 50 },
    { productId: products[3].id, warehouseId: warehouses[1].id, totalUnits: 35 },
    { productId: products[3].id, warehouseId: warehouses[2].id, totalUnits: 45 },

    // Stainless Steel Water Bottle
    { productId: products[4].id, warehouseId: warehouses[0].id, totalUnits: 30 },
    { productId: products[4].id, warehouseId: warehouses[1].id, totalUnits: 20 },
    { productId: products[4].id, warehouseId: warehouses[2].id, totalUnits: 2 },
  ];

  const stockLevels = await Promise.all(
    stockData.map((sl) =>
      prisma.stockLevel.create({
        data: {
          productId: sl.productId,
          warehouseId: sl.warehouseId,
          totalUnits: sl.totalUnits,
          reservedUnits: 0,
        },
      })
    )
  );

  console.log(`✅ Created ${stockLevels.length} stock levels`);
  console.log("\n🎉 Database seeded successfully!");
  console.log("\nSummary:");
  console.log(`  Products:     ${products.length}`);
  console.log(`  Warehouses:   ${warehouses.length}`);
  console.log(`  Stock Levels: ${stockLevels.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
