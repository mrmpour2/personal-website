export const mockFallbackEnabled: boolean;
export const mockFallbackIndicatorEnabled: boolean;

export function isMockFallbackEligible(error: unknown): boolean;

export function resolveCatalogItems<T>(
  status: "loading" | "ready" | "error",
  liveItems: readonly T[],
  fallbackItems: readonly T[],
  fallbackEligible: boolean,
  enabled?: boolean,
): readonly T[];

export function cartLineKey(
  productId: string,
  variantId?: string | null,
  selectedOptionIds?: readonly string[],
): string;

export function cartLineUnitPrice(line: {
  price: number;
  selectedOptions?: readonly { priceDelta: number }[];
}): number;

export function reconcileLiveCartLines<T extends { key: string; productId: string; parentKey?: string }>(
  lines: readonly T[],
  liveProductIds: ReadonlySet<string>,
): T[];
