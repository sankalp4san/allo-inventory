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
      <div className="clean-card clean-card-hover flex flex-col h-full overflow-hidden group">
        {/* Premium Image Area */}
        <div className="relative h-64 bg-black/40 flex items-center justify-center border-b border-[var(--border)] overflow-hidden">
          {product.imageUrl ? (
            <>
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
            </>
          ) : (
            <svg className="w-16 h-16 text-[var(--muted-foreground)] opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          
          <div className="absolute top-4 left-4">
            {totalAvailable > 0 ? (
               <span className="badge badge-neutral shadow-lg">
                 <span className="w-2 h-2 rounded-full bg-green-400 mr-2 shadow-[0_0_8px_#4ade80]"></span>
                 {totalAvailable} Available
               </span>
            ) : (
              <span className="badge badge-danger shadow-lg">Out of stock</span>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="p-6 flex flex-col flex-grow bg-gradient-to-b from-transparent to-black/20">
          <div className="mb-6">
            <h3 className="font-bold text-xl text-white leading-tight mb-2 tracking-tight group-hover:text-[var(--primary)] transition-colors">{product.name}</h3>
            <p className="text-xs text-[var(--primary)] font-mono mb-4 bg-[var(--primary)]/10 px-2 py-1 rounded inline-block">
              {product.sku}
            </p>
            <div className="text-2xl font-extrabold text-white">
              ₹{product.price.toLocaleString("en-IN")}
            </div>
          </div>

          <div className="mt-auto space-y-3 pt-5 border-t border-[var(--border)]">
            <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
              Fulfillment Centers
            </p>
            <div className="flex flex-col gap-2 h-[160px] overflow-y-auto pr-1">
              {product.stockLevels.map((sl) => (
                <div
                  key={sl.warehouseId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]/50 transition-colors hover:bg-[var(--muted)]/50"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-white">{sl.warehouseName}</span>
                    <span className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {sl.availableUnits} avail {sl.reservedUnits > 0 && `· ${sl.reservedUnits} hold`}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedStock(sl)}
                    disabled={sl.availableUnits <= 0}
                    className="btn btn-primary text-xs !px-4 !py-2 h-9 shadow-lg"
                  >
                    Hold
                  </button>
                </div>
              ))}
            </div>
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
