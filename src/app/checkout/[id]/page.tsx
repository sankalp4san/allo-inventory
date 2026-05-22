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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="glass-card p-8" style={{ transform: 'none' }}>
          <div className="space-y-4">
            <div className="h-6 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-20 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold mb-2">Reservation not found</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          This reservation may have expired or doesn&apos;t exist.
        </p>
        <button onClick={() => router.push("/")} className="btn btn-primary">
          ← Back to Products
        </button>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING" && !isExpired;
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const isFinalExpired = reservation.status === "EXPIRED" || isExpired;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Products
      </button>

      <h1 className="text-2xl font-bold">Checkout</h1>

      {/* Status badge */}
      <div className="flex items-center gap-3">
        <span
          className={`badge ${
            isPending ? "badge-warning" :
            isConfirmed ? "badge-success" :
            isReleased ? "badge-info" :
            "badge-danger"
          }`}
        >
          {isPending ? "Pending Payment" :
           isConfirmed ? "Confirmed" :
           isReleased ? "Cancelled" :
           "Expired"}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] font-mono">
          ID: {reservation.id}
        </span>
      </div>

      {/* Countdown timer (only for pending) */}
      {isPending && (
        <div className="glass-card p-6" style={{ transform: 'none' }}>
          <CountdownTimer
            expiresAt={reservation.expiresAt}
            onExpired={handleExpired}
          />
        </div>
      )}

      {/* Reservation details */}
      <div className="glass-card p-6" style={{ transform: 'none' }}>
        <h2 className="text-lg font-semibold mb-4">Reservation Details</h2>

        <div className="space-y-4">
          {reservation.product && (
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-violet-950/50 text-3xl">
                {reservation.product.sku?.startsWith('SNK') ? '👟' :
                 reservation.product.sku?.startsWith('BAG') ? '🎒' :
                 reservation.product.sku?.startsWith('AUD') ? '🎧' :
                 reservation.product.sku?.startsWith('TEE') ? '👕' :
                 reservation.product.sku?.startsWith('BTL') ? '🫗' : '📦'}
              </div>
              <div>
                <h3 className="font-semibold">{reservation.product.name}</h3>
                <p className="text-sm text-[var(--muted-foreground)] font-mono">
                  {reservation.product.sku}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Warehouse
              </p>
              <p className="text-sm font-medium">
                {reservation.warehouse?.name || reservation.warehouseId}
              </p>
              {reservation.warehouse?.location && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {reservation.warehouse.location}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Quantity
              </p>
              <p className="text-sm font-medium">
                {reservation.quantity} unit{reservation.quantity > 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Unit Price
              </p>
              <p className="text-sm font-medium">
                ₹{reservation.product?.price?.toLocaleString("en-IN") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Total
              </p>
              <p className="text-lg font-bold gradient-text">
                ₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {reservation.customerEmail && (
            <div className="pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Email
              </p>
              <p className="text-sm">{reservation.customerEmail}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons (only for pending) */}
      {isPending && (
        <div className="flex gap-4">
          <button
            onClick={handleRelease}
            disabled={!!actionLoading}
            className="btn btn-danger flex-1 py-3"
          >
            {actionLoading === "release" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Cancelling...
              </span>
            ) : (
              "Cancel Reservation"
            )}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!!actionLoading}
            className="btn btn-success flex-1 py-3"
          >
            {actionLoading === "confirm" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Confirming...
              </span>
            ) : (
              "✓ Confirm Purchase"
            )}
          </button>
        </div>
      )}

      {/* Final state messages */}
      {isConfirmed && (
        <div className="glass-card p-6 text-center border-emerald-800/30" style={{ transform: 'none' }}>
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2">
            Purchase Confirmed!
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Stock has been permanently allocated. Your order is being processed.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
            Continue Shopping
          </button>
        </div>
      )}

      {isReleased && (
        <div className="glass-card p-6 text-center border-violet-800/30" style={{ transform: 'none' }}>
          <div className="text-5xl mb-3">↩️</div>
          <h3 className="text-lg font-bold text-violet-400 mb-2">
            Reservation Cancelled
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Stock has been released back to the available pool.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
            Back to Products
          </button>
        </div>
      )}

      {isFinalExpired && reservation.status !== "CONFIRMED" && reservation.status !== "RELEASED" && (
        <div className="glass-card p-6 text-center border-red-800/30" style={{ transform: 'none' }}>
          <div className="text-5xl mb-3">⏰</div>
          <h3 className="text-lg font-bold text-red-400 mb-2">
            Reservation Expired
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            The reservation window has ended. Stock has been released.
          </p>
          <button onClick={() => router.push("/")} className="btn btn-primary mt-4">
            Back to Products
          </button>
        </div>
      )}
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
