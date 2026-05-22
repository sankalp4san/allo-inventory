import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/reservation-service";
import type { ProductResponse } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Lazy cleanup: release expired reservations before computing availability
    await releaseExpiredReservations();

    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: {
            warehouse: {
              select: { id: true, name: true, location: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const response: ProductResponse[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      stockLevels: product.stockLevels.map((sl) => ({
        warehouseId: sl.warehouse.id,
        warehouseName: sl.warehouse.name,
        warehouseLocation: sl.warehouse.location,
        totalUnits: sl.totalUnits,
        reservedUnits: sl.reservedUnits,
        availableUnits: sl.totalUnits - sl.reservedUnits,
      })),
    }));

    return NextResponse.json({ products: response });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
