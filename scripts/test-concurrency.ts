import "dotenv/config";
import prisma from "../src/lib/prisma";
import {
  createReservation,
  confirmReservation,
  releaseReservation,
} from "../src/lib/reservation-service";
import { v4 as uuidv4 } from "uuid";

async function runTests() {
  console.log("🧪 Starting Concurrency and Expiry Tests...\n");

  // Find a product and warehouse
  const product = await prisma.product.findFirst();
  const warehouse = await prisma.warehouse.findFirst();

  if (!product || !warehouse) {
    throw new Error("Seed data is missing. Please run seed script first.");
  }

  console.log(`Product: ${product.name} (ID: ${product.id})`);
  console.log(`Warehouse: ${warehouse.name} (ID: ${warehouse.id})\n`);

  // Reset stock level for this test
  await prisma.stockLevel.update({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
    data: {
      totalUnits: 1,
      reservedUnits: 0,
    },
  });

  console.log("1. Concurrency Test: 10 concurrent requests for 1 available unit...");
  
  const promises = Array.from({ length: 10 }).map(() =>
    createReservation({
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: 1,
      customerEmail: "tester@example.com",
      idempotencyKey: uuidv4(),
    })
  );

  const results = await Promise.all(promises);

  const successes = results.filter((r) => r.success);
  const conflicts = results.filter((r) => r.statusCode === 409);
  const others = results.filter((r) => r.statusCode !== 201 && r.statusCode !== 409);

  console.log(`- Successes: ${successes.length}`);
  console.log(`- Conflicts (409): ${conflicts.length}`);
  console.log(`- Others: ${others.length}`);

  if (successes.length !== 1) {
    console.error("❌ FAIL: Exactly 1 request should have succeeded.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Exactly 1 reservation succeeded.");
  }

  const reservation = successes[0].reservation!;
  console.log(`  Reservation ID: ${reservation.id}`);

  // Check database state
  let stock = await prisma.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
  });
  console.log(`  Database Stock: total=${stock?.totalUnits}, reserved=${stock?.reservedUnits}`);
  if (stock?.reservedUnits !== 1 || stock?.totalUnits !== 1) {
    console.error("❌ FAIL: Stock level not updated correctly.");
    process.exit(1);
  }

  console.log("\n2. Expiry Test: Mark reservation as expired and verify it gets released...");
  // Manually update the expiresAt to 10 seconds in the past
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { expiresAt: new Date(Date.now() - 10000) },
  });

  // Try to confirm it
  const confirmResult = await confirmReservation(reservation.id);
  console.log(`- Confirm expired reservation status code: ${confirmResult.statusCode}`);
  if (confirmResult.statusCode !== 410) {
    console.error("❌ FAIL: Confirming expired reservation should return 410 Gone.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Confirmation of expired reservation returned 410.");
  }

  // Check if stock was released
  stock = await prisma.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
  });
  console.log(`  Database Stock: total=${stock?.totalUnits}, reserved=${stock?.reservedUnits}`);
  if (stock?.reservedUnits !== 0) {
    console.error("❌ FAIL: Reserved stock was not released on expiry check.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Reserved stock was released.");
  }

  console.log("\n3. Confirmation Test: Create, confirm, and verify stock is consumed...");
  // Set stock to 5 units
  await prisma.stockLevel.update({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
    data: {
      totalUnits: 5,
      reservedUnits: 0,
    },
  });

  const res2 = await createReservation({
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 2,
    customerEmail: "tester2@example.com",
    idempotencyKey: uuidv4(),
  });

  if (!res2.success) {
    console.error("❌ FAIL: Could not create reservation.");
    process.exit(1);
  }

  const confirmRes2 = await confirmReservation(res2.reservation!.id);
  if (!confirmRes2.success) {
    console.error(`❌ FAIL: Could not confirm reservation: ${confirmRes2.error}`);
    process.exit(1);
  } else {
    console.log("✅ PASS: Reservation confirmed successfully.");
  }

  stock = await prisma.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
  });
  console.log(`  Database Stock: total=${stock?.totalUnits}, reserved=${stock?.reservedUnits}`);
  if (stock?.totalUnits !== 3 || stock?.reservedUnits !== 0) {
    console.error("❌ FAIL: Stock should be total=3, reserved=0.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Stock correctly decremented (total=3, reserved=0).");
  }

  console.log("\n4. Release Test: Create, release, and verify reserved units are returned...");
  const res3 = await createReservation({
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 1,
    customerEmail: "tester3@example.com",
    idempotencyKey: uuidv4(),
  });

  if (!res3.success) {
    console.error("❌ FAIL: Could not create reservation.");
    process.exit(1);
  }

  const releaseRes3 = await releaseReservation(res3.reservation!.id);
  if (!releaseRes3.success) {
    console.error("❌ FAIL: Could not release reservation.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Reservation released successfully.");
  }

  stock = await prisma.stockLevel.findUnique({
    where: {
      productId_warehouseId: {
        productId: product.id,
        warehouseId: warehouse.id,
      },
    },
  });
  console.log(`  Database Stock: total=${stock?.totalUnits}, reserved=${stock?.reservedUnits}`);
  if (stock?.totalUnits !== 3 || stock?.reservedUnits !== 0) {
    console.error("❌ FAIL: Stock should be total=3, reserved=0.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Reserved units returned to pool.");
  }

  console.log("\n5. Idempotency Test: Repeat reservation request with same idempotency key...");
  const idempotencyKey = uuidv4();
  const res4_1 = await createReservation({
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 1,
    customerEmail: "tester4@example.com",
    idempotencyKey,
  });

  const res4_2 = await createReservation({
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 1,
    customerEmail: "tester4@example.com",
    idempotencyKey,
  });

  console.log(`- First call status: ${res4_1.statusCode}`);
  console.log(`- Second call status: ${res4_2.statusCode}`);

  if (res4_1.reservation?.id !== res4_2.reservation?.id) {
    console.error("❌ FAIL: Second call did not return the identical reservation.");
    process.exit(1);
  } else if (res4_2.statusCode !== 200) {
    console.error("❌ FAIL: Second call should return 200 OK.");
    process.exit(1);
  } else {
    console.log("✅ PASS: Idempotent call returned same reservation with 200 status code.");
  }

  console.log("\n✨ ALL TESTS PASSED SUCCESSFULLY! ✨");
  await prisma.$disconnect();
}

runTests().catch(async (e) => {
  console.error("❌ Test failed with error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
