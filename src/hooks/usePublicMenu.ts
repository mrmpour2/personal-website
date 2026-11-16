import { useEffect, useState } from "react";
import { fetchPublicMenu, patchPublicMenuProduct, peekPublicMenu, refreshPublicMenu } from "@/api/menu";
import { isMockFallbackEligible, mockFallbackEnabled } from "@/utils/catalogSource.js";
import type { MenuItem } from "@/types";

export interface PublicMenuState {
  /** آیتم‌های زنده بک‌اند (خالی وقتی درخواست در جریان است یا شکست خورده). */
  items: MenuItem[];
  /**
   * `loading` تا رسیدن اولین پاسخ، `ready` وقتی داده داریم و
   * `error` وقتی API در دسترس نیست (صفحه‌ها کاتالوگ ثابت را نشان می‌دهند).
   */
  status: "loading" | "ready" | "error";
  fallbackEligible: boolean;
  usingMockFallback: boolean;
}

/**
 * فهرست منوی زنده را از `/api/public/menu` می‌خواند.
 *
 * درخواست داخل `@/api/menu` کش می‌شود، پس چند کامپوننت/صفحه یعنی یک درخواست.
 * اگر پاسخ قبلاً رسیده باشد، وضعیت از همان ابتدا `ready` است تا هنگام
 * جابه‌جایی بین صفحه‌ها فلش لودینگ نبینیم.
 */
export function usePublicMenu(): PublicMenuState {
  const [state, setState] = useState<PublicMenuState>(() => {
    const cached = peekPublicMenu();
    return cached ? { items: cached, status: "ready", fallbackEligible: false, usingMockFallback: false } : { items: [], status: "loading", fallbackEligible: false, usingMockFallback: false };
  });

  useEffect(() => {
    if (state.status === "ready") return;

    let active = true;

    fetchPublicMenu()
      .then((items) => {
        if (active) setState({ items, status: "ready", fallbackEligible: false, usingMockFallback: false });
      })
      .catch((error: unknown) => {
        const fallbackEligible = isMockFallbackEligible(error);
        if (active) setState({ items: [], status: "error", fallbackEligible, usingMockFallback: mockFallbackEnabled && fallbackEligible });
      });

    return () => {
      active = false;
    };
    // فقط یک‌بار در هر mount؛ `state.status` عمداً در وابستگی‌ها نیست تا با
    // تغییر وضعیت، درخواست دوباره فرستاده نشود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => { void refreshPublicMenu().then((items) => { if (active) setState({ items, status: "ready", fallbackEligible: false, usingMockFallback: false }); }).catch(() => undefined); };
    window.addEventListener("realtime:resync", refresh);
    return () => { active = false; window.removeEventListener("realtime:resync", refresh); };
  }, []);

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ productId: string; changes: Record<string, unknown> }>).detail;
      const next = patchPublicMenuProduct(detail.productId, detail.changes);
      if (next) setState((current) => ({ ...current, items: next }));
    };
    window.addEventListener("realtime:product", update);
    return () => window.removeEventListener("realtime:product", update);
  }, []);

  return state;
}
