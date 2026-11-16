import type { MenuItem } from "@/types";

/** Shared client preview math. The API remains authoritative when an order is created. */
export function calculateConfiguredUnitPrice(basePrice: number, optionPriceDeltas: number[] = []): number {
  return basePrice + optionPriceDeltas.reduce((sum, value) => sum + value, 0);
}

export function calculateAddOnSubtotal(items: MenuItem[], quantities: Record<string, number>): number {
  return items.reduce((sum, item) => sum + item.price * (quantities[item.productId ?? item.id] ?? 0), 0);
}
