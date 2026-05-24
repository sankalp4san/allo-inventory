import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/reservations/:id
 *
 * Fetch a single reservation by ID with its product and warehouse details.
 * Used by the checkout page to load reservation data on mount/refresh.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
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
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservation" },
      { status: 500 }
    );
  }
}
