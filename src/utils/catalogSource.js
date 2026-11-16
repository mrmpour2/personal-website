import axios from "axios";

export const mockFallbackEnabled = import.meta.env?.VITE_ENABLE_MOCK_FALLBACK === "true";
export const mockFallbackIndicatorEnabled = import.meta.env?.DEV === true;

export function isMockFallbackEligible(error) {
  if (!axios.isAxiosError(error)) return false;
  if (error.response) return error.response.status >= 500;
  return error.code !== "ERR_CANCELED";
}

export function resolveCatalogItems(status, liveItems, fallbackItems, fallbackEligible, enabled = mockFallbackEnabled) {
  if (status === "ready") return liveItems;
  if (status === "error" && fallbackEligible && enabled) return fallbackItems;
  return [];
}

export function cartLineKey(productId, variantId, selectedOptionIds = []) {
  const base = variantId ? `${productId}::${variantId}` : productId;
  const optionKey = [...selectedOptionIds].sort().join(",");
  return optionKey ? `${base}::options=${optionKey}` : base;
}

export function cartLineUnitPrice(line) {
  return line.price + (line.selectedOptions ?? []).reduce((total, option) => total + option.priceDelta, 0);
}

export function reconcileLiveCartLines(lines, liveProductIds) {
  const liveLines = lines.filter((line) => liveProductIds.has(line.productId));
  const parentKeys = new Set(liveLines.filter((line) => !line.parentKey).map((line) => line.key));
  return liveLines.filter((line) => !line.parentKey || parentKeys.has(line.parentKey));
}
