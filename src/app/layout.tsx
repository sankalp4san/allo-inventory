import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allo Inventory | Smart Stock Reservation System",
  description:
    "Real-time inventory management with concurrency-safe stock reservations for multi-warehouse retail operations.",
  keywords: ["inventory", "reservation", "warehouse", "stock management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grid-pattern min-h-screen">
        <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[#09090b]/90 backdrop-blur-xl">
          <div className="flex h-16 w-full items-center justify-between px-6 md:px-12 2xl:px-24">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-violet-500">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <span className="text-lg font-bold gradient-text">Allo Inventory</span>
            </a>
            <nav className="flex items-center gap-4">
              <a
                href="/"
                className="text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                Products
              </a>
            </nav>
          </div>
        </header>
        <main className="w-full px-6 md:px-12 2xl:px-24 py-8">{children}</main>
      </body>
    </html>
  );
}
