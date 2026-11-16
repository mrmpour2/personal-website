import { mockFallbackIndicatorEnabled } from "@/utils/catalogSource.js";

export function MockFallbackMarker({ active }: { active: boolean }) {
  if (!active || !mockFallbackIndicatorEnabled) return null;
  return <span hidden data-testid="mock-catalog-fallback">mock catalog fallback</span>;
}
