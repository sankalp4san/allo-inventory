"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";
import type { ProductResponse, StockLevelResponse } from "@/lib/validators";
import { v4 as uuidv4 } from "uuid";

interface ReserveModalProps {
  product: ProductResponse;
  stockLevel: StockLevelResponse;
  onClose: () => void;
}

export function ReserveModal({ product, stockLevel, onClose }: ReserveModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  const handleReserve = async () => {
    setLoading(true);
    try {
      const idempotencyKey = uuidv4();

      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: stockLevel.warehouseId,
          quantity,
          customerEmail: email || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        addToast(
          `Not enough stock available. Only ${data.availableUnits} unit(s) remaining.`,
          "error"
        );
        setLoading(false);
        return;
      }

      if (!res.ok) {
        addToast(data.error || "Failed to create reservation", "error");
        setLoading(false);
        return;
      }

      addToast("Reservation created! Redirecting to checkout...", "success");
      sessionStorage.setItem(
        `reservation-${data.reservation.id}`,
        JSON.stringify(data.reservation)
      );
      router.push(`/checkout/${data.reservation.id}`);
    } catch {
      addToast("Network error. Please try again.", "error");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Secure Inventory</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[var(--muted-foreground)] hover:bg-white/10 hover:text-white transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Product Summary Box */}
          <div className="bg-black/30 rounded-xl p-5 border border-white/5 shadow-inner">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-base text-white">{product.name}</p>
                <p className="text-xs text-[var(--primary)] font-mono mt-1 px-1.5 py-0.5 bg-[var(--primary)]/10 rounded inline-block">{product.sku}</p>
              </div>
              <p className="font-bold text-lg text-white">₹{product.price.toLocaleString("en-IN")}</p>
            </div>
            <div className="pt-4 mt-2 border-t border-white/10 flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)] flex items-center gap-2 font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {stockLevel.warehouseName}
              </span>
              <span className="badge badge-success shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                {stockLevel.availableUnits} units available
              </span>
            </div>
          </div>

          <div className="space-y-5">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-white/90 uppercase tracking-wider text-[11px]">
                Select Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn btn-outline h-12 w-12 !p-0 font-bold text-xl rounded-xl"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={stockLevel.availableUnits}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(
                        Math.max(1, parseInt(e.target.value) || 1),
                        stockLevel.availableUnits
                      )
                    )
                  }
                  className="input flex-1 text-center font-bold text-lg h-12 rounded-xl"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(quantity + 1, stockLevel.availableUnits))
                  }
                  className="btn btn-outline h-12 w-12 !p-0 font-bold text-xl rounded-xl"
                  disabled={quantity >= stockLevel.availableUnits}
                >
                  +
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-white/90 uppercase tracking-wider text-[11px]">
                Customer Email <span className="font-normal text-[var(--muted-foreground)] normal-case text-xs ml-1">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="input h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[var(--primary)]/10 text-indigo-200 p-4 rounded-xl border border-[var(--primary)]/20 shadow-inner">
            <svg className="w-5 h-5 flex-shrink-0 text-[var(--primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs leading-relaxed font-medium">
              This inventory will be held exclusively for you for <strong className="text-white">10 minutes</strong>. Other shoppers won't be able to purchase it during this window.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleReserve}
              disabled={loading || quantity < 1 || quantity > stockLevel.availableUnits}
              className="btn btn-primary w-full py-4 h-14 text-base rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Securing...
                </span>
              ) : (
                `Hold ${quantity} Unit${quantity > 1 ? 's' : ''} • ₹${(product.price * quantity).toLocaleString("en-IN")}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
