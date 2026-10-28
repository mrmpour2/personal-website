import { useEffect } from "react";

/**
 * Boots the data-attribute driven GSAP motion system once per page load.
 * Every tween/ScrollTrigger/listener lives inside a `gsap.context()`, so the
 * effect cleanup restores the DOM to its pre-animation state.
 */
export function useMotionSystem(): void {
  useEffect(() => {
    let destroyed = false;
    let cleanup: (() => void) | undefined;

    void import("@/motion/motionSystem")
      .then(({ startMotionSystem }) => {
        if (destroyed) return;
        const controller = startMotionSystem();
        cleanup = () => controller.destroy();
      })
      .catch(() => undefined);

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);
}
