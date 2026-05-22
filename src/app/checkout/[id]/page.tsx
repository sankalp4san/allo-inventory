"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { CountdownTimer } from "@/components/countdown-timer";
import { ToastProvider, useToast } from "@/components/toast";
import type { ReservationResponse } from "@/lib/validators";

function CheckoutContent({ id }: { id: string }) {
  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    // We don't have a GET endpoint for single reservation,
    // so we'll store reservation data in sessionStorage after creation
    const stored = sessionStorage.getItem(`reservation-${id}`);
    if (stored) {
      const data = JSON.parse(stored) as ReservationResponse;
      setReservation(data);
      // Check if already expired on load
      if (new Date(data.expiresAt) < new Date()) {
        setIsExpired(true);
      }
    }
    setLoading(false);
  }, [id]);

  const handleConfirm = useCallback(async () => {
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.status === 410) {
        addToast("Reservation has expired. Stock has been released.", "error");
        setIsExpired(true);
        if (reservation) {
          setReservation({ ...reservation, status: "EXPIRED" });
        }
        setActionLoading(null);
        return;
      }

      if (!res.ok) {
        addToast(data.error || "Failed to confirm reservation", "error");
        setActionLoading(null);
        return;
      }

      addToast("Purchase confirmed! Stock has been permanently allocated.", "success");
      setReservation(data.reservation);
      sessionStorage.setItem(`reservation-${id}`, JSON.stringify(data.reservation));
    } catch {
      addToast("Network error. Please try again.", "error");
    }
    setActionLoading(null);
  }, [id, reservation, addToast]);

  const handleRelease = useCallback(async () => {
    setActionLoading("release");
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        addToast(data.error || "Failed to cancel reservation", "error");
        setActionLoading(null);
        return;
      }

      addToast("Reservation cancelled. Stock has been released.", "info");
      setReservation(data.reservation);
      sessionStorage.setItem(`reservation-${id}`, JSON.stringify(data.reservation));
    } catch {
      addToast("Network error. Please try again.", "error");
    }
    setActionLoading(null);
  }, [id, addToast]);

  const handleExpired = useCallback(() => {
    setIsExpired(true);
    addToast("Reservation has expired. Stock released automatically.", "warning");
  }, [addToast]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-12">
        <div className="h-6 w-32 skeleton mb-8" />
        <div className="clean-card p-8 border border-[var(--border)]">
          <div className="space-y-6">
            <div className="h-6 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-px bg-[var(--border)] my-6" />
            <div className="h-24 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-xl mx-auto text-center py-24">
        <svg className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h2 className="text-xl font-medium mb-2 text-[var(--foreground)]">Reservation Not Found</h2>
        <p className="text-[var(--muted-foreground)] mb-8">
          This reservation session may have expired or does not exist.
        </p>
        <button onClick={() => router.push("/")} className="btn btn-primary px-6">
          Return to Store
        </button>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING" && !isExpired;
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const isFinalExpired = reservation.status === "EXPIRED" || isExpired;

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6 font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Store
      </button>

      <div className="clean-card border border-[var(--border)] overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--muted)]/50 p-6 border-b border-[var(--border)]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--foreground)] mb-1">Checkout</h1>
              <p className="text-xs text-[var(--muted-foreground)] font-mono">Order #{reservation.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span
              className={`badge ${
                isPending ? "badge-warning" :
                isConfirmed ? "badge-success" :
                isReleased ? "badge-neutral" :
                "badge-danger"
              }`}
            >
              {isPending ? "Awaiting Payment" :
               isConfirmed ? "Confirmed" :
               isReleased ? "Cancelled" :
               "Expired"}
            </span>
          </div>
        </div>

        {/* Timer */}
        {isPending && (
          <div className="bg-amber-50 border-b border-amber-100 p-4 flex flex-col items-center justify-center">
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wide mb-1.5">Reservation Expires In</p>
            <CountdownTimer
              expiresAt={reservation.expiresAt}
              onExpired={handleExpired}
            />
          </div>
        )}

        {/* Order Details */}
        <div className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">Order Summary</h2>

          {reservation.product && (
            <div className="flex gap-4 mb-6 pb-6 border-b border-[var(--border)]">
              <div className="w-16 h-16 bg-[var(--muted)] rounded-md flex items-center justify-center border border-[var(--border)]">
                {reservation.product.imageUrl ? (
                  <img src={reservation.product.imageUrl} alt={reservation.product.name} className="object-cover w-full h-full rounded-md" />
                ) : (
                  <svg className="w-8 h-8 text-[var(--muted-foreground)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--foreground)]">{reservation.product.name}</h3>
                <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">{reservation.product.sku}</p>
                <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Qty: <span className="font-medium text-[var(--foreground)]">{reservation.quantity}</span>
                </div>
              </div>
              <div className="font-medium text-[var(--foreground)]">
                ₹{reservation.product.price?.toLocaleString("en-IN") || "—"}
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Subtotal</span>
              <span className="font-medium">₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">Fulfillment</span>
              <span className="text-right">
                <span className="font-medium">{reservation.warehouse?.name || reservation.warehouseId}</span>
                {reservation.warehouse?.location && (
                  <span className="block text-xs text-[var(--muted-foreground)]">{reservation.warehouse.location}</span>
                )}
              </span>
            </div>
            <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
              <span className="font-semibold text-[var(--foreground)]">Total Due</span>
              <span className="text-2xl font-bold text-[var(--foreground)]">
                ₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="p-6 bg-[var(--muted)]/30 border-t border-[var(--border)]">
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              className="btn btn-primary w-full py-3 h-12 text-sm shadow-sm mb-3"
            >
              {actionLoading === "confirm" ? "Processing Payment..." : "Pay Now to Confirm"}
            </button>
            <button
              onClick={handleRelease}
              disabled={!!actionLoading}
              className="btn btn-outline w-full py-2.5 text-sm"
            >
              {actionLoading === "release" ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>
        )}

        {/* Post-Action States */}
        {isConfirmed && (
          <div className="p-6 bg-emerald-50 border-t border-emerald-100 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-emerald-800 font-bold mb-1">Payment Successful</h3>
            <p className="text-emerald-600 text-sm mb-4">Your items have been secured and are ready for fulfillment.</p>
            <button onClick={() => router.push("/")} className="btn btn-success text-sm px-6">
              Continue Shopping
            </button>
          </div>
        )}

        {isReleased && (
          <div className="p-6 bg-[var(--muted)] border-t border-[var(--border)] text-center">
            <p className="text-[var(--foreground)] font-medium mb-1">Order Cancelled</p>
            <p className="text-[var(--muted-foreground)] text-sm mb-4">Your reservation has been released.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline bg-white text-sm px-6">
              Browse More Products
            </button>
          </div>
        )}

        {isFinalExpired && reservation.status !== "CONFIRMED" && reservation.status !== "RELEASED" && (
          <div className="p-6 bg-red-50 border-t border-red-100 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-red-800 font-bold mb-1">Reservation Expired</h3>
            <p className="text-red-600 text-sm mb-4">You ran out of time to complete the checkout.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline bg-white text-sm px-6">
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return (
    <ToastProvider>
      <CheckoutContent id={resolvedParams.id} />
    </ToastProvider>
  );
}
