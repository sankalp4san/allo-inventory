"use client";

import { useState } from "react";
import { ReserveModal } from "./reserve-modal";
import type { ProductResponse, StockLevelResponse } from "@/lib/validators";

interface ProductCardProps {
  product: ProductResponse;
}

export function ProductCard({ product }: ProductCardProps) {
  const [selectedStock, setSelectedStock] = useState<StockLevelResponse | null>(null);

  const totalAvailable = product.stockLevels.reduce(
    (sum, sl) => sum + sl.availableUnits,
    0
  );

  return (
    <>
      <div className="clean-card clean-card-hover flex flex-col h-full overflow-hidden">
        {/* Minimalist image placeholder area */}
        <div className="relative h-48 bg-[var(--muted)] flex items-center justify-center border-b border-[var(--border)]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <svg className="w-12 h-12 text-[var(--muted-foreground)] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <div className="absolute top-3 left-3">
            {totalAvailable > 0 ? (
               <span className="badge badge-neutral bg-white/90 backdrop-blur-sm border border-[var(--border)] shadow-sm">
                 {totalAvailable} In Stock
               </span>
            ) : (
              <span className="badge badge-danger shadow-sm">Out of stock</span>
            )}
          </div>
        </div>

        {/* Product details */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-4">
            <h3 className="font-semibold text-base text-[var(--foreground)] leading-tight mb-1">{product.name}</h3>
            <p className="text-xs text-[var(--muted-foreground)] font-mono mb-3">
              {product.sku}
            </p>
            <div className="text-lg font-bold text-[var(--foreground)]">
              ₹{product.price.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-4 border-t border-[var(--border)]">
            <p className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
              Warehouses
            </p>
            {product.stockLevels.map((sl) => (
              <div
                key={sl.warehouseId}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-[var(--foreground)]">{sl.warehouseName}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {sl.availableUnits} avail {sl.reservedUnits > 0 && `· ${sl.reservedUnits} rsvd`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedStock(sl)}
                  disabled={sl.availableUnits <= 0}
                  className="btn btn-outline text-xs !px-3 !py-1 h-8"
                >
                  Reserve
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedStock && (
        <ReserveModal
          product={product}
          stockLevel={selectedStock}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </>
  );
}
