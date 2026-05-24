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
      <div className="page-container space-y-16 relative z-10">
        {/* Stunning Header */}
        <header className="pb-10 pt-8 border-b border-[var(--border)] relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/10 to-transparent blur-3xl -z-10" />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight gradient-text">
                  Allo Inventory
                </h1>
              </div>
              <p className="text-[var(--muted-foreground)] max-w-2xl text-lg font-light leading-relaxed ml-1">
                A highly-concurrent, state-of-the-art inventory reservation platform.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-lg backdrop-blur-md">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_#10b981]"></span>
                </span>
                <span className="text-sm font-semibold tracking-wide text-white uppercase">Live Sync Active</span>
              </div>
            </div>
          </div>
        </header>

        {/* Products grid */}
        <main>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-wide">Featured Drops</h2>
            <div className="text-sm font-medium px-3 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] shadow-inner">
              <span className="text-[var(--primary)]">{products.length}</span> <span className="text-[var(--muted-foreground)]">items available</span>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="clean-card overflow-hidden">
                  <div className="h-56 skeleton rounded-none border-b border-[var(--border)]" />
                  <div className="p-6 space-y-4">
                    <div className="h-6 w-3/4 skeleton" />
                    <div className="h-4 w-1/3 skeleton" />
                    <div className="h-8 w-1/4 skeleton mt-6" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 bg-red-950/20 rounded-2xl border border-red-500/20 backdrop-blur-md">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-red-200 mb-2">Connection Failed</h2>
              <p className="text-red-400/80 mb-8 max-w-md text-center">{error}</p>
              <button onClick={fetchProducts} className="btn btn-outline border-red-500/30 text-red-300 hover:bg-red-500/10 hover:border-red-500/50">
                Attempt Reconnection
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-[var(--card)] rounded-2xl border border-[var(--border)] border-dashed backdrop-blur-sm">
              <svg className="w-16 h-16 text-[var(--muted-foreground)] mb-6 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-2xl font-bold mb-3 text-white/80">Inventory Empty</h2>
              <p className="text-[var(--muted-foreground)]">
                The vault is currently empty. Seed the database to deploy products.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {products.map((product) => (
                <div key={product.id} className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-1.5rem)] xl:w-[calc(25%-1.5rem)] max-w-[340px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
