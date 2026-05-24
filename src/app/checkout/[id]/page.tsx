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
        const res = await fetch(`/api/reservations/${id}`);
        if (res.ok) {
          const data = await res.json();
          setReservation(data.reservation);
          sessionStorage.setItem(`reservation-${id}`, JSON.stringify(data.reservation));
          if (new Date(data.reservation.expiresAt) < new Date() && data.reservation.status === "PENDING") {
            setIsExpired(true);
          }
        } else {
          const stored = sessionStorage.getItem(`reservation-${id}`);
          if (stored) {
            const data = JSON.parse(stored) as ReservationResponse;
            setReservation(data);
            if (new Date(data.expiresAt) < new Date()) setIsExpired(true);
          }
        }
      } catch {
        const stored = sessionStorage.getItem(`reservation-${id}`);
        if (stored) {
          const data = JSON.parse(stored) as ReservationResponse;
          setReservation(data);
          if (new Date(data.expiresAt) < new Date()) setIsExpired(true);
        }
      }
      setLoading(false);
    };
    fetchReservation();
  }, [id]);

  const handleConfirm = useCallback(async () => {
    setActionLoading("confirm");
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.status === 410) {
        addToast("Reservation has expired. Stock has been released.", "error");
        setIsExpired(true);
        if (reservation) setReservation({ ...reservation, status: "EXPIRED" });
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
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
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

  const isPending = reservation ? reservation.status === "PENDING" && !isExpired : false;
  const isConfirmed = reservation?.status === "CONFIRMED";
  const isReleased = reservation?.status === "RELEASED";
  const isFinalExpired = (reservation?.status === "EXPIRED" || isExpired) && !isConfirmed && !isReleased;

  // Loading skeleton — full-width two-column
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="h-6 w-40 skeleton mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="clean-card p-8"><div className="h-48 skeleton" /></div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="clean-card p-8"><div className="h-64 skeleton" /></div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!reservation) {
    return (
      <div className="max-w-6xl mx-auto text-center py-32 px-4">
        <div className="w-20 h-20 bg-[var(--muted)]/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">Reservation Not Found</h2>
        <p className="text-[var(--muted-foreground)] mb-10 text-lg">This reservation may have expired or does not exist.</p>
        <button onClick={() => router.push("/")} className="btn btn-primary px-8 py-3 text-base rounded-xl">
          ← Back to Products
        </button>
      </div>
    );
  }

  const productEmoji = reservation.product?.sku?.startsWith('SNK') ? '👟' :
    reservation.product?.sku?.startsWith('BAG') ? '🎒' :
    reservation.product?.sku?.startsWith('AUD') ? '🎧' :
    reservation.product?.sku?.startsWith('TEE') ? '👕' :
    reservation.product?.sku?.startsWith('BTL') ? '🫗' : '📦';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-white transition-colors mb-8 font-medium"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Products
      </button>

      {/* Post-action full-width banners */}
      {isConfirmed && (
        <div className="clean-card overflow-hidden mb-8 border border-emerald-500/20">
          <div className="bg-emerald-950/40 p-10 text-center">
            <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-emerald-300 mb-2">Payment Confirmed</h2>
            <p className="text-emerald-400/70 mb-6">Your items have been secured and are ready for fulfillment.</p>
            <button onClick={() => router.push("/")} className="btn btn-success px-8 py-3 rounded-xl">Continue Shopping</button>
          </div>
        </div>
      )}

      {isReleased && (
        <div className="clean-card overflow-hidden mb-8">
          <div className="bg-black/40 p-10 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Order Cancelled</h2>
            <p className="text-[var(--muted-foreground)] mb-6">Your reservation has been released. Stock is available again.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline px-8 py-3 rounded-xl">Browse Products</button>
          </div>
        </div>
      )}

      {isFinalExpired && (
        <div className="clean-card overflow-hidden mb-8 border border-red-500/20">
          <div className="bg-red-950/30 p-10 text-center">
            <div className="w-16 h-16 bg-red-500/15 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-red-300 mb-2">Reservation Expired</h2>
            <p className="text-red-400/70 mb-6">The checkout window has closed. Please try again.</p>
            <button onClick={() => router.push("/")} className="btn btn-outline border-red-500/30 text-red-200 hover:bg-red-500/10 px-8 py-3 rounded-xl">Try Again</button>
          </div>
        </div>
      )}

      {/* ─── Two-Column Split Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

        {/* ─── LEFT: Order Details (3/5 width) ─── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Checkout</h1>
              <p className="text-sm text-[var(--muted-foreground)] font-mono mt-1">Order #{reservation.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className={`badge ${isPending ? "badge-warning" : isConfirmed ? "badge-success" : isReleased ? "badge-neutral" : "badge-danger"}`}>
              {isPending ? "Awaiting Payment" : isConfirmed ? "Confirmed" : isReleased ? "Cancelled" : "Expired"}
            </span>
          </div>

          {/* Product Card */}
          <div className="clean-card p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-5">Product Details</h2>
            {reservation.product && (
              <div className="flex gap-5">
                <div className="w-24 h-24 bg-black/40 rounded-xl flex items-center justify-center border border-[var(--border)] flex-shrink-0 overflow-hidden">
                  {reservation.product.imageUrl ? (
                    <img src={reservation.product.imageUrl} alt={reservation.product.name} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-4xl">{productEmoji}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg">{reservation.product.name}</h3>
                  <p className="text-xs text-[var(--primary)] font-mono mt-1 px-2 py-0.5 bg-[var(--primary)]/10 rounded inline-block">{reservation.product.sku}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)]/40 px-3 py-1 rounded-lg">
                      Qty: <span className="font-bold text-white">{reservation.quantity}</span>
                    </span>
                    <span className="text-lg font-bold text-white">
                      ₹{reservation.product.price?.toLocaleString("en-IN") || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fulfillment Info */}
          <div className="clean-card p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-5">Fulfillment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-black/30 rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Warehouse</p>
                <p className="font-semibold text-white">{reservation.warehouse?.name || "—"}</p>
                {reservation.warehouse?.location && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{reservation.warehouse.location}</p>
                )}
              </div>
              <div className="bg-black/30 rounded-xl p-4 border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Reserved At</p>
                <p className="font-semibold text-white">{new Date(reservation.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
            </div>
          </div>

          {/* Timer (only pending) */}
          {isPending && (
            <div className="clean-card p-6 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-xs font-bold text-amber-400 uppercase tracking-[0.2em]">Reservation Expires In</p>
              </div>
              <CountdownTimer expiresAt={reservation.expiresAt} onExpired={handleExpired} />
            </div>
          )}
        </div>

        {/* ─── RIGHT: Payment Summary (2/5 width) ─── */}
        <div className="lg:col-span-2">
          <div className="clean-card overflow-hidden lg:sticky lg:top-24">

            {/* Summary Header */}
            <div className="p-6 border-b border-[var(--border)]">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Order Summary</h2>
            </div>

            {/* Line Items */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Subtotal ({reservation.quantity} item{reservation.quantity > 1 ? 's' : ''})</span>
                <span className="font-semibold text-white">₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Shipping</span>
                <span className="text-emerald-400 font-medium">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted-foreground)]">Tax</span>
                <span className="text-[var(--muted-foreground)]">Included</span>
              </div>
              <div className="h-px bg-[var(--border)] my-2" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm uppercase tracking-wider">Total</span>
                <span className="text-2xl font-extrabold gradient-text">
                  ₹{((reservation.product?.price || 0) * reservation.quantity).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Action Buttons (only pending) */}
            {isPending && (
              <div className="p-6 border-t border-[var(--border)] bg-black/20 space-y-3">
                <button
                  onClick={handleConfirm}
                  disabled={!!actionLoading}
                  className="btn btn-primary w-full py-4 text-base rounded-xl shadow-[0_0_25px_rgba(139,92,246,0.35)]"
                >
                  {actionLoading === "confirm" ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      Confirm Payment
                    </span>
                  )}
                </button>
                <button
                  onClick={handleRelease}
                  disabled={!!actionLoading}
                  className="btn btn-outline w-full py-3 text-sm rounded-xl"
                >
                  {actionLoading === "release" ? "Cancelling..." : "Cancel Reservation"}
                </button>

                {/* Trust signals */}
                <div className="flex items-center justify-center gap-4 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    Secure
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Encrypted
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Verified
                  </div>
                </div>
              </div>
            )}

            {/* Final state summary when not pending */}
            {!isPending && (
              <div className="p-6 border-t border-[var(--border)] bg-black/20">
                <p className="text-xs text-center text-[var(--muted-foreground)]">
                  {isConfirmed ? "Payment processed successfully" :
                   isReleased ? "Reservation has been cancelled" :
                   "This reservation has expired"}
                </p>
              </div>
            )}
          </div>
        </div>
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
