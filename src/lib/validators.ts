import { z } from "zod";

// ─── Reservation Request ────────────────────────────────────────────────────
export const createReservationSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  warehouseId: z.string().min(1, "Warehouse ID is required"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// ─── API Response Types ─────────────────────────────────────────────────────
export interface StockLevelResponse {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
}

export interface ProductResponse {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stockLevels: StockLevelResponse[];
}

export interface WarehouseResponse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationResponse {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED" | "EXPIRED";
  expiresAt: string;
  customerEmail: string | null;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl: string | null;
  };
  warehouse?: {
    id: string;
    name: string;
    location: string;
  };
}

export interface ApiError {
  error: string;
  availableUnits?: number;
}
