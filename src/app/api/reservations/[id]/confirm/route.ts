import { NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation-service";
import {
  getIdempotencyKey,
  getIdempotentResponse,
  setIdempotentResponse,
} from "@/lib/idempotency";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for idempotency
    const idempotencyKey = getIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const result = await confirmReservation(id);

    const responseBody = result.success
      ? { reservation: result.reservation }
      : { error: result.error };

    if (idempotencyKey) {
      await setIdempotentResponse(
        idempotencyKey,
        result.statusCode,
        responseBody
      );
    }

    return NextResponse.json(responseBody, { status: result.statusCode });
  } catch (error) {
    console.error("Error in POST /api/reservations/:id/confirm:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
