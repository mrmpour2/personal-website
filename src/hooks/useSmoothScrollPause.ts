import { useEffect } from "react";

export function useSmoothScrollPause(shouldPause: boolean): void {
  useEffect(() => {
    if (!shouldPause) return;

    let cancelled = false;
    let release: (() => void) | undefined;
    void import("@/motion/smoothScroll")
      .then(({ pauseSmoothScroll }) => {
        if (cancelled) return;
        release = pauseSmoothScroll();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      release?.();
    };
  }, [shouldPause]);
}
