import type { RestaurantAvailability } from "@/context/RestaurantAvailabilityContext";

export function canCreateNewOrder(
  availability: RestaurantAvailability | null,
  unavailable?: boolean,
): boolean;

export function canSubmitCheckoutOrder(input: {
  pendingOrder: unknown;
  availability: RestaurantAvailability | null;
  unavailable?: boolean;
}): boolean;
