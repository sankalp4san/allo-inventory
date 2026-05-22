import { NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservation-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await releaseReservation(id);

    const responseBody = result.success
      ? { reservation: result.reservation }
      : { error: result.error };

    return NextResponse.json(responseBody, { status: result.statusCode });
  } catch (error) {
    console.error("Error in POST /api/reservations/:id/release:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
