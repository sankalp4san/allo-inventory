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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Reserve Stock</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Product info */}
          <div className="glass-card p-4" style={{ transform: 'none' }}>
            <p className="font-semibold text-base">{product.name}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              SKU: {product.sku}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Warehouse: {stockLevel.warehouseName}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-lg font-bold gradient-text">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              <span className="badge badge-success">
                {stockLevel.availableUnits} available
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="btn btn-ghost h-10 w-10 !p-0"
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
                className="input w-20 text-center"
              />
              <button
                onClick={() =>
                  setQuantity(Math.min(quantity + 1, stockLevel.availableUnits))
                }
                className="btn btn-ghost h-10 w-10 !p-0"
                disabled={quantity >= stockLevel.availableUnits}
              >
                +
              </button>
            </div>
          </div>

          {/* Email (optional) */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--muted-foreground)]">
              Email <span className="text-xs">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="input"
            />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-[var(--border)]">
            <span className="text-[var(--muted-foreground)]">Total</span>
            <span className="text-xl font-bold">
              ₹{(product.price * quantity).toLocaleString("en-IN")}
            </span>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 rounded-lg bg-violet-950/30 border border-violet-800/20 p-3">
            <span className="text-violet-400 text-sm mt-0.5">ℹ</span>
            <p className="text-xs text-violet-300/80">
              Stock will be reserved for 10 minutes. You can confirm your purchase
              or cancel anytime during this window.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={handleReserve}
              disabled={loading || quantity < 1 || quantity > stockLevel.availableUnits}
              className="btn btn-primary flex-1"
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
                "Reserve Now"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
