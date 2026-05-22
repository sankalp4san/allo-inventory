# Allo Engineering - Inventory Reservation System

This is the submission for the Allo Engineering take-home exercise. It implements a concurrency-safe inventory reservation system for a multi-warehouse retail platform.

## 🚀 Live Demo
- **App URL**: [To be added upon deployment]
- **Hosted Database**: [To be added upon deployment]

## 🛠️ Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (End-to-End)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS + Custom CSS (for a premium UI)
- **Validation**: Zod (Shared between API and frontend)

## 🏃‍♂️ How to Run Locally

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd allo-inventory
   npm install
   ```

2. **Database Setup**
   Ensure you have a PostgreSQL database running.
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/allo_inventory?schema=public"
   ```

3. **Migrate and Seed**
   Push the schema to the database and seed it with initial data (Products, Warehouses, Stock Levels):
   ```bash
   npx prisma db push
   npm run seed
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

5. **Run Concurrency Tests**
   We have included a concurrency test script that fires simultaneous requests to ensure race conditions are handled correctly:
   ```bash
   npm run test:concurrency
   ```

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
The reserve and confirm endpoints support idempotency. If a client sends an `Idempotency-Key` header:
- We check a local cache (or an `IdempotencyRecord` table in Postgres for distributed setups) before processing.
- If the key exists, we immediately return the cached response (status code and body) without re-executing the transaction.
- This prevents duplicate reservations if a client's network drops and they retry the exact same request.

## ⏱️ Reservation Expiry Mechanism

Reservations are held for a specific window (e.g., 10 minutes) and then must be released to make stock available again. We implement this using a hybrid approach:

1. **Lazy Cleanup on Read**:
   Whenever the `GET /api/products` endpoint is hit (e.g., when a user loads the product listing page), we first run a lightweight query to find and release any reservations where `expiresAt < now()` and `status == 'pending'`. This ensures that shoppers always see the most accurate, up-to-date availability without waiting for a scheduled job.

2. **Scheduled Cleanup (Vercel Cron)**:
   For absolute guarantees and to clean up orphaned reservations if traffic is low, we expose a cron endpoint at `GET /api/cron/expire-reservations`. 
   In production on Vercel, this is triggered every minute via `vercel.json` crons. It uses the `CRON_SECRET` to ensure only Vercel can trigger it.

## 🤔 Trade-offs & Future Improvements

1. **Redis vs PostgreSQL for Locks & Idempotency**
   - *Current Implementation*: We used PostgreSQL's native `FOR UPDATE` locks. For idempotency, we used an in-memory cache mechanism.
   - *Trade-off*: While Redis is standard for distributed locking (e.g., Redlock) and fast idempotency caching, introducing it adds infrastructure complexity. Postgres row-level locks are strongly consistent, ACID-compliant, and perfectly adequate for moderate-to-high traffic on a single database node. 
   - *With more time*: If this were a hyper-scale system (e.g., flash sales with 100k requests/sec), Postgres row locks would create a bottleneck. In that scenario, I would implement Redis for idempotency and potentially Redis-based stock decrements (using Lua scripts) before persisting to Postgres asynchronously.

2. **Hard Deletes vs Soft Deletes**
   - Currently, releasing an expired reservation changes its `status` to `released`. This is good for auditability. With massive scale, this table would grow infinitely.
   - *With more time*: I would implement partition tables by date in Postgres, or archive `released`/`confirmed` reservations to a cold storage data warehouse (like Snowflake/BigQuery) after 30 days.

3. **Frontend Polling vs WebSockets**
   - The UI currently requires a manual refresh or relies on Next.js client-side router refreshes to update stock limits.
   - *With more time*: I would implement Supabase Realtime (or standard WebSockets/Server-Sent Events) to push stock updates to all connected clients instantly when someone else reserves a unit.
