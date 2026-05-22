/**
 * Reservation Service
 *
 * Core business logic for creating, confirming, and releasing reservations.
 * Uses PostgreSQL row-level locking (SELECT ... FOR UPDATE) to guarantee
 * correctness under concurrent access.
 *
 * Concurrency Strategy:
 * --------------------
 * When two requests simultaneously try to reserve the last unit of a SKU,
 * we use SELECT ... FOR UPDATE inside a serializable transaction. This
 * acquires an exclusive row-level lock on the StockLevel row. The second
 * transaction blocks until the first commits, then sees the updated
 * reservedUnits and correctly returns a 409.
 */

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const RESERVATION_TTL_MINUTES = 10;

interface CreateReservationParams {
  productId: string;
  warehouseId: string;
  quantity: number;
  customerEmail?: string;
  idempotencyKey?: string;
}

interface ReservationResult {
  success: boolean;
  reservation?: Awaited<ReturnType<typeof prisma.reservation.findUnique>>;
  error?: string;
  availableUnits?: number;
  statusCode: number;
}

/**
 * Create a reservation with pessimistic locking.
 *
 * Uses a raw SQL transaction with SELECT ... FOR UPDATE to lock the
 * StockLevel row, preventing race conditions when multiple requests
 * try to reserve the same stock simultaneously.
 */
export async function createReservation(
  params: CreateReservationParams
): Promise<ReservationResult> {
  const { productId, warehouseId, quantity, customerEmail, idempotencyKey } =
    params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Lock the stock level row with FOR UPDATE
      // This blocks any concurrent transaction trying to read the same row
      const stockRows = await tx.$queryRaw<
        Array<{
          id: string;
          totalUnits: number;
          reservedUnits: number;
        }>
      >`
        SELECT id, "totalUnits", "reservedUnits"
        FROM "StockLevel"
        WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      `;

      if (stockRows.length === 0) {
        return {
          success: false,
          error: "Product not found in this warehouse",
          statusCode: 404,
        };
      }

      const stock = stockRows[0];
      const available = stock.totalUnits - stock.reservedUnits;

      // Step 2: Check availability
      if (available < quantity) {
        return {
          success: false,
          error: "Insufficient stock available",
          availableUnits: available,
          statusCode: 409,
        };
      }

      // Step 3: Increment reserved units (still within the lock)
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = "reservedUnits" + ${quantity}
        WHERE id = ${stock.id}
      `;

      // Step 4: Create the reservation record
      const expiresAt = new Date(
        Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000
      );

      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          customerEmail: customerEmail || null,
          idempotencyKey: idempotencyKey || null,
        },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true, imageUrl: true },
          },
          warehouse: {
            select: { id: true, name: true, location: true },
          },
        },
      });

      return {
        success: true,
        reservation,
        statusCode: 201,
      };
    }, {
      // SELECT ... FOR UPDATE provides row-level locking;
      // no need for Serializable isolation level
      timeout: 10000, // 10 second timeout
    });

    return result as ReservationResult;
  } catch (error) {
    // Handle unique constraint violation for idempotencyKey
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Idempotent retry — find and return the existing reservation
      if (idempotencyKey) {
        const existing = await prisma.reservation.findUnique({
          where: { idempotencyKey },
          include: {
            product: {
              select: { id: true, name: true, sku: true, price: true, imageUrl: true },
            },
            warehouse: {
              select: { id: true, name: true, location: true },
            },
          },
        });

        if (existing) {
          return {
            success: true,
            reservation: existing,
            statusCode: 200, // 200 because it's a replay
          };
        }
      }
    }

    console.error("Error creating reservation:", error);
    return {
      success: false,
      error: "Failed to create reservation. Please try again.",
      statusCode: 500,
    };
  }
}

/**
 * Confirm a reservation (payment succeeded).
 *
 * - Checks that the reservation is still PENDING
 * - Checks that it hasn't expired (returns 410 if it has)
 * - Decrements both totalUnits and reservedUnits (stock permanently consumed)
 * - Updates status to CONFIRMED
 */
export async function confirmReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the reservation
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true, imageUrl: true },
          },
          warehouse: {
            select: { id: true, name: true, location: true },
          },
        },
      });

      if (!reservation) {
        return {
          success: false,
          error: "Reservation not found",
          statusCode: 404,
        };
      }

      if (reservation.status !== "PENDING") {
        return {
          success: false,
          error: `Reservation is already ${reservation.status.toLowerCase()}`,
          statusCode: 400,
        };
      }

      // Check expiry — return 410 Gone if expired
      if (new Date() > reservation.expiresAt) {
        // Auto-release the expired reservation
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: "EXPIRED" },
        });

        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
          WHERE "productId" = ${reservation.productId}
            AND "warehouseId" = ${reservation.warehouseId}
        `;

        return {
          success: false,
          error: "Reservation has expired",
          statusCode: 410,
        };
      }

      // Confirm: decrement totalUnits (permanently consumed) and reservedUnits (no longer held)
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "totalUnits" = "totalUnits" - ${reservation.quantity},
            "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "CONFIRMED" },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true, imageUrl: true },
          },
          warehouse: {
            select: { id: true, name: true, location: true },
          },
        },
      });

      return {
        success: true,
        reservation: updated,
        statusCode: 200,
      };
    });

    return result as ReservationResult;
  } catch (error) {
    console.error("Error confirming reservation:", error);
    return {
      success: false,
      error: "Failed to confirm reservation",
      statusCode: 500,
    };
  }
}

/**
 * Release a reservation early (payment failed or user cancelled).
 *
 * - Checks that the reservation is PENDING
 * - Decrements reservedUnits (units return to available pool)
 * - Updates status to RELEASED
 */
export async function releaseReservation(
  reservationId: string
): Promise<ReservationResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true, imageUrl: true },
          },
          warehouse: {
            select: { id: true, name: true, location: true },
          },
        },
      });

      if (!reservation) {
        return {
          success: false,
          error: "Reservation not found",
          statusCode: 404,
        };
      }

      if (reservation.status !== "PENDING") {
        return {
          success: false,
          error: `Reservation is already ${reservation.status.toLowerCase()}`,
          statusCode: 400,
        };
      }

      // Release: decrement reservedUnits (units return to available pool)
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0)
        WHERE "productId" = ${reservation.productId}
          AND "warehouseId" = ${reservation.warehouseId}
      `;

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: "RELEASED" },
        include: {
          product: {
            select: { id: true, name: true, sku: true, price: true, imageUrl: true },
          },
          warehouse: {
            select: { id: true, name: true, location: true },
          },
        },
      });

      return {
        success: true,
        reservation: updated,
        statusCode: 200,
      };
    });

    return result as ReservationResult;
  } catch (error) {
    console.error("Error releasing reservation:", error);
    return {
      success: false,
      error: "Failed to release reservation",
      statusCode: 500,
    };
  }
}

/**
 * Release all expired PENDING reservations.
 *
 * Called by:
 * 1. Vercel Cron job (every minute) — background safety net
 * 2. Lazily before stock queries — ensures fresh availability data
 *
 * Uses a batch approach: find all expired PENDING reservations,
 * then release each one within its own transaction.
 */
export async function releaseExpiredReservations(): Promise<number> {
  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
  });

  let releasedCount = 0;

  for (const reservation of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Double-check status hasn't changed
        const current = await tx.reservation.findUnique({
          where: { id: reservation.id },
        });

        if (current && current.status === "PENDING") {
          await tx.$executeRaw`
            UPDATE "StockLevel"
            SET "reservedUnits" = GREATEST("reservedUnits" - ${current.quantity}, 0)
            WHERE "productId" = ${current.productId}
              AND "warehouseId" = ${current.warehouseId}
          `;

          await tx.reservation.update({
            where: { id: reservation.id },
            data: { status: "EXPIRED" },
          });

          releasedCount++;
        }
      });
    } catch (error) {
      console.error(
        `Failed to release expired reservation ${reservation.id}:`,
        error
      );
    }
  }

  return releasedCount;
}
