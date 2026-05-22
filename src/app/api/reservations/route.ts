import { NextResponse } from "next/server";
import { createReservationSchema } from "@/lib/validators";
import { createReservation } from "@/lib/reservation-service";
import {
  getIdempotencyKey,
  getIdempotentResponse,
  setIdempotentResponse,
} from "@/lib/idempotency";

export async function POST(request: Request) {
  try {
    // Check for idempotency key
    const idempotencyKey = getIdempotencyKey(request);

    if (idempotencyKey) {
      const cached = await getIdempotentResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

    const body = await request.json();

    // Validate input with Zod
    const parsed = createReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await createReservation({
      ...parsed.data,
      idempotencyKey: idempotencyKey || undefined,
    });

    const responseBody = result.success
      ? { reservation: result.reservation }
      : { error: result.error, availableUnits: result.availableUnits };

    // Cache the response for idempotency
    if (idempotencyKey) {
      await setIdempotentResponse(
        idempotencyKey,
        result.statusCode,
        responseBody
      );
    }

    return NextResponse.json(responseBody, { status: result.statusCode });
  } catch (error) {
    console.error("Error in POST /api/reservations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
