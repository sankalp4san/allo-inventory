# Allo Engineering - Inventory Reservation System

This is the submission for the Allo Engineering take-home exercise. It implements a concurrency-safe inventory reservation system for a multi-warehouse retail platform.

## 🚀 Live Demo
- **App URL**: [https://allo-inventory-d5lf.vercel.app/](https://allo-inventory-d5lf.vercel.app/)
- **Hosted Database**: Neon Serverless PostgreSQL
- **Distributed Cache**: Upstash Redis (For Idempotency)

## 🛠️ Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (End-to-End)
- **Database**: PostgreSQL via Prisma ORM (Hosted on [Neon](https://neon.tech))
- **Caching**: Upstash Redis (REST-based, serverless-friendly)
- **Styling**: Tailwind CSS + Custom CSS (Dark Mode Glassmorphism)
- **Validation**: Zod (Shared schemas between API and frontend)

## 🏃‍♂️ How to Run Locally

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd allo-inventory
   npm install
   ```

2. **Database Setup**
   Create a `.env` file (see `.env.example`):
   ```env
   # Required — Use a hosted Postgres provider (Neon, Supabase, Railway)
   DATABASE_URL="postgresql://user:password@host:5432/allo_inventory?sslmode=require"

   # Optional — Enables idempotency via Upstash Redis
   UPSTASH_REDIS_REST_URL=""
   UPSTASH_REDIS_REST_TOKEN=""

   # Optional — Protects the cron endpoint in production
   CRON_SECRET=""
   ```

3. **Migrate and Seed**
   Push the schema to the database and seed it with demo data (5 products, 3 warehouses, 15 stock levels):
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🧠 Architecture & Concurrency Correctness

### The Race Condition Problem
When multiple users try to check out the last unit of a product simultaneously, a race condition occurs. If we only check `availableUnits` in memory, both requests might succeed before the database is updated.

### The Solution: Pessimistic Locking
To guarantee correctness under high concurrency, this system uses **Row-Level Pessimistic Locking** in PostgreSQL (`SELECT ... FOR UPDATE`).

When a reservation is created:
1. We start an interactive database transaction.
2. We query the `StockLevel` row and lock it using `FOR UPDATE`. This prevents any other transaction from reading or modifying this specific row until our transaction completes.
3. We check if `totalUnits - reservedUnits >= requestedUnits`.
4. If yes, we create the `Reservation` record and increment the `reservedUnits` on the `StockLevel`.
5. If no, we return a `409 Conflict`.
6. The transaction commits and the lock is released.

This guarantees that if two requests arrive simultaneously for the last unit, the database will serialize them. The first will succeed, and the second will see the updated `reservedUnits` and fail with a 409.

### Idempotency (Bonus)
The reserve and confirm endpoints support idempotency via a two-layer deduplication strategy:

1. **Layer 1 — Upstash Redis Cache**: When a client sends an `Idempotency-Key` header, we first check Upstash Redis for a cached response under that key (24-hour TTL). If found, we return the cached response immediately without re-executing the transaction.
2. **Layer 2 — Database Unique Constraint**: The `Reservation` model has a `@unique` constraint on `idempotencyKey`. If Redis is unavailable or the cache has expired, the database rejects duplicate keys via a `P2002` error, and we return the existing reservation.

This ensures that even if a client's network drops and they retry the exact same request, no duplicate reservation is ever created.

## ⏱️ Reservation Expiry Mechanism

Reservations are held for **10 minutes** and then must be released to make stock available again. We implement this using a hybrid approach:

1. **Lazy Cleanup on Read**:
   Whenever the `GET /api/products` endpoint is hit (e.g., when a user loads the product listing page), we first run a lightweight query to find and release any reservations where `expiresAt < now()` and `status == 'PENDING'`. This ensures that shoppers always see the most accurate, up-to-date availability without waiting for a scheduled job.

2. **Scheduled Cleanup (Vercel Cron)**:
   For absolute guarantees and to clean up orphaned reservations if traffic is low, we expose a cron endpoint at `GET /api/cron/expire-reservations`.
   In production on Vercel, this is configured to run via `vercel.json` crons. The endpoint is protected by `CRON_SECRET` to ensure only Vercel can trigger it. Note: Vercel's free tier limits cron frequency to once daily; on the Pro tier, this can be configured to run every minute.

3. **Client-Side Countdown**:
   The checkout page displays a live countdown timer. When it hits zero, the UI immediately shows "Reservation Expired" and fires a toast notification — providing instant feedback to the user.

## 📋 API Endpoints

| Method | Path | Behaviour |
|--------|------|-----------|
| GET | `/api/products` | List products with available stock per warehouse (lazy cleanup first) |
| GET | `/api/warehouses` | List all warehouses |
| POST | `/api/reservations` | Reserve units for a product/warehouse. Returns `409` if insufficient stock |
| GET | `/api/reservations/:id` | Fetch a single reservation by ID (used by checkout page) |
| POST | `/api/reservations/:id/confirm` | Confirm the reservation (payment succeeded). Returns `410` if expired |
| POST | `/api/reservations/:id/release` | Release the reservation early (payment failed or user cancelled) |
| GET | `/api/cron/expire-reservations` | Cron endpoint to release all expired pending reservations |

## 🤔 Trade-offs & Future Improvements

1. **Redis vs PostgreSQL for Locks & Idempotency**
   - *Current Implementation*: We use PostgreSQL's native `FOR UPDATE` row-level locks for concurrency control. For idempotency, we use Upstash Redis as a fast cache layer with the database unique constraint as a fallback.
   - *Trade-off*: Redis provides sub-millisecond cache lookups which is perfect for idempotency. For locking, Postgres row-level locks are strongly consistent, ACID-compliant, and perfectly adequate for moderate-to-high traffic on a single database node.
   - *With more time*: For hyper-scale flash sales (100k req/sec), I would use Redis-based Lua scripts for atomic stock decrements before persisting to Postgres asynchronously.

2. **Soft Deletes & Auditability**
   - Currently, releasing an expired reservation changes its `status` to `EXPIRED`. This is great for auditability — we never lose data about what happened.
   - *With more time*: I would implement table partitioning by date in Postgres, or archive old reservations to a data warehouse after 30 days.

3. **Frontend Polling vs WebSockets**
   - The UI auto-refreshes product data every 10 seconds via polling.
   - *With more time*: I would implement Supabase Realtime (or WebSockets/Server-Sent Events) to push stock updates to all connected clients instantly when someone else reserves a unit.

4. **Confirm/Release Locking**
   - The `createReservation` flow uses `SELECT ... FOR UPDATE` on the StockLevel row for strict correctness. The `confirm` and `release` flows use application-level status checks with `GREATEST(0, ...)` guards to prevent negative values.
   - *With more time*: I would add `FOR UPDATE` locking on the Reservation row in confirm/release as well, for defense-in-depth under extreme concurrency.
