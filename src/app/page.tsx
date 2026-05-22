"use client";

import { useState, useEffect, useCallback } from "react";
import { ProductCard } from "@/components/product-card";
import { ToastProvider } from "@/components/toast";
import type { ProductResponse } from "@/lib/validators";

export default function HomePage() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.products);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    // Auto-refresh every 10 seconds for live stock updates
    const interval = setInterval(fetchProducts, 10000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  return (
    <ToastProvider>
      <div className="page-container space-y-12">
        {/* Header */}
        <header className="border-b border-[var(--border)] pb-8 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] mb-2">
                Allo Inventory
              </h1>
              <p className="text-[var(--muted-foreground)] max-w-2xl text-base">
                Real-time inventory reservations with concurrency safety.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Live Sync
              </div>
            </div>
          </div>
        </header>

        {/* Products grid */}
        <main>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Available Products</h2>
            <span className="text-sm text-[var(--muted-foreground)]">{products.length} items</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="clean-card overflow-hidden">
                  <div className="h-48 skeleton rounded-none border-b border-[var(--border)]" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 skeleton" />
                    <div className="h-4 w-1/3 skeleton" />
                    <div className="h-6 w-1/4 skeleton mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-100">
              <svg className="w-12 h-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-medium text-red-800 mb-2">Failed to load products</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button onClick={fetchProducts} className="btn btn-outline bg-white">
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] border-dashed">
              <svg className="w-12 h-12 text-[var(--muted-foreground)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-lg font-medium mb-1">No products found</h2>
              <p className="text-[var(--muted-foreground)]">
                The database is currently empty. Run the seed script to populate data.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
