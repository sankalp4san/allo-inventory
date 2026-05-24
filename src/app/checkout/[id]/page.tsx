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
    const fetchReservation = async () => {
      try {
        // Try to load from API first (works on page refresh / direct URL)
        const res = await fetch(`/api/reservations/${id}`);
        if (res.ok) {
          const data = await res.json();
          setReservation(data.reservation);
          sessionStorage.setItem(`reservation-${id}`, JSON.stringify(data.reservation));
          if (new Date(data.reservation.expiresAt) < new Date() && data.reservation.status === "PENDING") {
            setIsExpired(true);
          }
        } else {
          // Fallback to sessionStorage cache
          const stored = sessionStorage.getItem(`reservation-${id}`);
          if (stored) {
            const data = JSON.parse(stored) as ReservationResponse;
            setReservation(data);
            if (new Date(data.expiresAt) < new Date()) {
              setIsExpired(true);
            }
          }
        }
      } catch {
        // Network error — try sessionStorage
        const stored = sessionStorage.getItem(`reservation-${id}`);
        if (stored) {
          const data = JSON.parse(stored) as ReservationResponse;
          setReservation(data);
          if (new Date(data.expiresAt) < new Date()) {
            setIsExpired(true);
          }
        }
      }
      setLoading(false);
    };
    fetchReservation();
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
      <div className="max-w-xl mx-auto space-y-6 pt-16 relative z-10 px-4">
        <div className="h-6 w-32 skeleton mb-8" />
        <div className="clean-card p-8 border border-[var(--border)]">
          <div className="space-y-6">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-px bg-[var(--border)] my-6" />
            <div className="h-32 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-xl mx-auto text-center py-32 relative z-10 px-4">
        <div className="w-20 h-20 bg-[var(--muted)]/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">Reservation Not Found</h2>
        <p className="text-[var(--muted-foreground)] mb-10 text-lg">
          This secure session may have expired or does not exist.
        </p>
        <button onClick={() => router.push("/")} className="btn btn-primary px-8 py-3 text-base rounded-full">
          Return to Vault
        </button>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING" && !isExpired;
  const isConfirmed = reservation.status === "CONFIRMED";
  const isReleased = reservation.status === "RELEASED";
  const isFinalExpired = reservation.status === "EXPIRED" || isExpired;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 relative z-10">
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-white transition-colors mb-8 font-semibold tracking-wide uppercase"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Store
      </button>

      <div className="clean-card overflow-hidden relative">
        {/* Header */}
        <div className="bg-black/40 p-8 border-b border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Secure Checkout</h1>
              <p className="text-sm text-[var(--primary)] font-mono bg-[var(--primary)]/10 px-2 py-1 rounded inline-block border border-[var(--primary)]/20">
                Order #{reservation.id.slice(0, 8).toUpperCase()}
              </p>
            </div>
            <div className="self-start">
              <span
                className={`badge shadow-lg ${
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
        </div>

        {/* Timer */}
        {isPending && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-b border-amber-500/20 p-6 flex flex-col items-center justify-center backdrop-blur-md">
            <p className="text-xs font-bold text-amber-500/90 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Reservation Expires In
            </p>
            <div className="scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <CountdownTimer
                expiresAt={reservation.expiresAt}
                onExpired={handleExpired}
              />
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="p-8">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-6">Order Summary</h2>

          {reservation.product && (
            <div className="flex gap-5 mb-8 pb-8 border-b border-[var(--border)]">
              <div className="w-20 h-20 bg-black/50 rounded-xl flex items-center justify-center border border-[var(--border)] shadow-inner overflow-hidden">
                {reservation.product.imageUrl ? (
                  <img src={reservation.product.imageUrl} alt={reservation.product.name} className="object-cover w-full h-full" />
                ) : (
                  <svg className="w-8 h-8 text-[var(--muted-foreground)] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-bold text-white text-lg">{reservation.product.name}</h3>
                <p className="text-xs text-[var(--muted-foreground)] font-mono mt-1 mb-2">{reservation.product.sku}</p>
                <div className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/30 px-2 py-1 rounded inline-block">
                  Qty: <span className="font-bold text-white">{reservation.quantity}</span>
                </div>
              </div>
              <div className="font-bold text-white text-lg pt-1">
                ₹{reservation.product.price?.toLocaleString("en-IN") || "—"}
              </div>
            </div>
          )}

          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center p-3 rounded-lg hover:bg-[var(--muted)]/20 transition-colors">
              <span className="text-[var(--muted-foreground)] font-medium">Subtotal</span>
              <span className="font-semibold text-white/90">₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between p-3 rounded-lg hover:bg-[var(--muted)]/20 transition-colors">
              <span className="text-[var(--muted-foreground)] font-medium">Fulfillment Center</span>
              <span className="text-right">
                <span className="font-semibold text-white/90 block">{reservation.warehouse?.name || reservation.warehouseId}</span>
                {reservation.warehouse?.location && (
                  <span className="text-xs text-[var(--muted-foreground)] mt-0.5 block">{reservation.warehouse.location}</span>
                )}
              </span>
            </div>
            <div className="pt-6 mt-2 border-t border-[var(--border)] flex justify-between items-center">
              <span className="font-bold text-white uppercase tracking-wider text-xs">Total Due</span>
              <span className="text-3xl font-extrabold gradient-text drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                ₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="p-8 bg-black/40 border-t border-[var(--border)]">
            <button
              onClick={handleConfirm}
              disabled={!!actionLoading}
              className="btn btn-primary w-full py-4 h-14 text-base shadow-[0_0_20px_rgba(139,92,246,0.4)] mb-4 rounded-xl"
            >
              {actionLoading === "confirm" ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : "Secure Payment"}
            </button>
            <button
              onClick={handleRelease}
              disabled={!!actionLoading}
              className="btn btn-outline w-full py-3 h-12 text-sm rounded-xl border-transparent hover:border-[var(--border)]"
            >
              {actionLoading === "release" ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>
        )}

        {/* Post-Action States */}
        {isConfirmed && (
          <div className="p-8 bg-emerald-950/30 border-t border-emerald-500/20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-emerald-500/5 blur-2xl"></div>
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)] relative z-10">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-emerald-400 font-bold text-xl mb-2 relative z-10">Payment Successful</h3>
            <p className="text-emerald-500/70 text-sm mb-6 relative z-10">Your items have been secured and are ready for fulfillment.</p>
            <button onClick={() => router.push("/")} className="btn btn-success text-sm px-8 py-3 rounded-full relative z-10 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              Continue Shopping
            </button>
          </div>
        )}

        {isReleased && (
          <div className="p-8 bg-black/60 border-t border-[var(--border)] text-center">
            <h3 className="text-white font-bold text-xl mb-2">Order Cancelled</h3>
            <p className="text-[var(--muted-foreground)] text-sm mb-6">Your reservation has been released back into the vault.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline text-sm px-8 py-3 rounded-full">
              Browse More Products
            </button>
          </div>
        )}

        {isFinalExpired && reservation.status !== "CONFIRMED" && reservation.status !== "RELEASED" && (
          <div className="p-8 bg-red-950/30 border-t border-red-500/20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 blur-2xl"></div>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)] relative z-10">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-red-400 font-bold text-xl mb-2 relative z-10">Reservation Expired</h3>
            <p className="text-red-500/70 text-sm mb-6 relative z-10">You ran out of time to complete the checkout.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline text-sm px-8 py-3 rounded-full relative z-10 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 text-red-200">
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
