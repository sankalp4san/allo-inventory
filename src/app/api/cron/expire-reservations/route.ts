import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/reservation-service";

/**
 * Cron endpoint to release expired reservations.
 * Called by Vercel Cron every minute.
 *
 * In production, this is protected by the CRON_SECRET environment variable.
 * Vercel automatically sends this secret with cron invocations.
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret in production
    if (process.env.CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const releasedCount = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      releasedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron expire-reservations:", error);
    return NextResponse.json(
      { error: "Failed to process expired reservations" },
      { status: 500 }
    );
  }
}
