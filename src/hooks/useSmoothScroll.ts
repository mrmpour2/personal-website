import { useEffect } from "react";
import { startSmoothScroll } from "@/motion/smoothScroll";

/**
 * Mounts the Lenis smooth-scroll loop for the lifetime of the app.
 * The effect returns Lenis' own cleanup, so React owns the teardown.
 */
export function useSmoothScroll(): void {
  useEffect(() => {
    let destroyed = false;
    let cleanup: (() => void) | undefined;

    void import("@/motion/smoothScroll")
      .then(({ startSmoothScroll }) => {
        if (destroyed) return;
        cleanup = startSmoothScroll();
      })
      .catch(() => undefined);

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);
}
