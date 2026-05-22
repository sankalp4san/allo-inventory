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
      // Store reservation data for the checkout page
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Hold Inventory</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Product Summary Box */}
          <div className="bg-[var(--muted)] rounded-lg p-4 border border-[var(--border)]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-sm text-[var(--foreground)]">{product.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">{product.sku}</p>
              </div>
              <p className="font-medium text-sm">₹{product.price.toLocaleString("en-IN")}</p>
            </div>
            <div className="pt-3 mt-3 border-t border-[var(--border)] flex justify-between items-center text-sm">
              <span className="text-[var(--muted-foreground)] flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {stockLevel.warehouseName}
              </span>
              <span className="badge badge-success bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                {stockLevel.availableUnits} left
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                Quantity
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="btn btn-outline h-10 w-10 !p-0 font-bold"
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
                  className="input flex-1 text-center font-medium"
                />
                <button
                  onClick={() =>
                    setQuantity(Math.min(quantity + 1, stockLevel.availableUnits))
                  }
                  className="btn btn-outline h-10 w-10 !p-0 font-bold"
                  disabled={quantity >= stockLevel.availableUnits}
                >
                  +
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]">
                Customer Email <span className="font-normal text-[var(--muted-foreground)]">(Optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="input"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
            <svg className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs leading-relaxed">
              This inventory will be reserved exclusively for you for <strong>10 minutes</strong>. Other shoppers won't be able to purchase it during this window.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleReserve}
              disabled={loading || quantity < 1 || quantity > stockLevel.availableUnits}
              className="btn btn-primary w-full py-3 h-12 shadow-sm text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Reserving...
                </span>
              ) : (
                `Reserve ${quantity} unit${quantity > 1 ? 's' : ''} • ₹${(product.price * quantity).toLocaleString("en-IN")}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
