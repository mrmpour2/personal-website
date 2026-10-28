import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { AddOnSheet } from "@/components/AddOnSheet";
import { CartDrawer } from "@/components/CartDrawer";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { AddOnPanelProvider } from "@/context/AddOnContext";
import { useMotionSystem } from "@/hooks/useMotionSystem";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

const ChatBox = lazy(() => import("@/components/ChatBox"));

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    let cancelled = false;
    void import("@/motion/smoothScroll")
      .then(({ refreshMotion, scrollToTop }) => {
        if (cancelled) return;
        scrollToTop();
        refreshMotion();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return null;
}

export function Layout() {
  const { i18n, t } = useTranslation();
  const [chatReady, setChatReady] = useState(false);
  const language = i18n.resolvedLanguage?.startsWith("fa") ? "fa" : "en";

  // One Lenis loop and one GSAP context for the whole app; both are torn down on
  // unmount and re-claim lazily mounted sections through their own observers.
  useSmoothScroll();
  useMotionSystem();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    document.title = t("brand.pageTitle");
    void import("@/motion/smoothScroll")
      .then(({ refreshMotion }) => refreshMotion())
      .catch(() => undefined);
  }, [language, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => setChatReady(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-bun-paper text-bun-text">
      <ScrollManager />
      {/* پنل مخلفات بالای همه است تا دکمه‌های «افزودن به سبد» هر صفحه (و کشوی
          سبد) بتوانند همان پنل را باز کنند. */}
      <AddOnPanelProvider>
        <Navbar />
        <main>
          <Outlet />
        </main>
        <Footer />
        {/* سبد خرید و نتیجه بازگشت از درگاه روی هر مسیری در دسترس‌اند. */}
        <CartDrawer />
        <AddOnSheet />
      </AddOnPanelProvider>
      {/* Pointer follower for `initCursor`; purely decorative. */}
      <div data-cursor="" aria-hidden="true">
        <span data-cursor-label="" />
      </div>
      {chatReady ? (
        <Suspense fallback={null}>
          <ChatBox />
        </Suspense>
      ) : null}
    </div>
  );
}
