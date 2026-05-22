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
      <div className="glass-card overflow-hidden group">
        {/* Product image area */}
        <div className="relative h-48 bg-gradient-to-br from-violet-950/50 to-purple-900/30 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDEyNCw1OCwyMzcsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-40"></div>
          <div className="text-5xl">
            {product.sku.startsWith('SNK') ? '👟' :
             product.sku.startsWith('BAG') ? '🎒' :
             product.sku.startsWith('AUD') ? '🎧' :
             product.sku.startsWith('TEE') ? '👕' :
             product.sku.startsWith('BTL') ? '🫗' : '📦'}
          </div>
          <div className="absolute top-3 right-3">
            <span className={`badge ${totalAvailable > 0 ? 'badge-success' : 'badge-danger'}`}>
              {totalAvailable > 0 ? `${totalAvailable} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>

        {/* Product details */}
        <div className="p-5">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mb-2 font-mono">
            {product.sku}
          </p>
          {product.description && (
            <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="text-xl font-bold gradient-text mb-4">
            ₹{product.price.toLocaleString("en-IN")}
          </div>

          {/* Stock levels per warehouse */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
              Warehouse Availability
            </p>
            {product.stockLevels.map((sl) => (
              <div
                key={sl.warehouseId}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--muted)] p-3 transition-all hover:bg-[var(--muted)]/80"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {sl.warehouseName}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {sl.availableUnits} of {sl.totalUnits} available
                    {sl.reservedUnits > 0 && (
                      <span className="text-amber-400 ml-1">
                        ({sl.reservedUnits} reserved)
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStock(sl)}
                  disabled={sl.availableUnits <= 0}
                  className="btn btn-primary text-xs !px-3 !py-1.5"
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
