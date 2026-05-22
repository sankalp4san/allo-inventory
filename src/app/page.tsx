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
      <div className="space-y-8">
        {/* Hero section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-950/80 via-purple-950/50 to-indigo-950/80 border border-violet-800/20 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="gradient-text">Stock Reservation</span>{" "}
              <span className="text-[var(--foreground)]">System</span>
            </h1>
            <p className="text-[var(--muted-foreground)] max-w-2xl text-base md:text-lg">
              Browse products across multiple warehouses. Reserve stock in real-time
              with concurrency-safe inventory management.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live inventory updates
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Race-condition free
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card overflow-hidden" style={{ transform: 'none' }}>
                <div className="h-48 skeleton" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-3/4 skeleton" />
                  <div className="h-4 w-1/3 skeleton" />
                  <div className="h-8 w-1/2 skeleton" />
                  <div className="space-y-2">
                    <div className="h-12 skeleton" />
                    <div className="h-12 skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Failed to load products</h2>
            <p className="text-[var(--muted-foreground)] mb-4">{error}</p>
            <button onClick={fetchProducts} className="btn btn-primary">
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-[var(--muted-foreground)]">
              Check back later or seed the database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
