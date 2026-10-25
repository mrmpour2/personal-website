import { useEffect, useRef } from "react";

/**
 * ویجت Cloudflare Turnstile.
 *
 * فقط وقتی کلید سایت (`VITE_TURNSTILE_SITE_KEY`) در build ست شده باشد رندر می‌شود.
 * توکن‌ها یک‌بارمصرف‌اند؛ برای گرفتن توکن تازه، `resetKey` را تغییر دهید.
 */
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const turnstileSiteKey: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile-script-failed"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  onToken: (token: string) => void;
  resetKey?: number;
  language?: "fa" | "en";
}

export function TurnstileWidget({ onToken, resetKey = 0, language = "en" }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!turnstileSiteKey || !container.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId = window.turnstile.render(container.current, {
          sitekey: turnstileSiteKey,
          language: language === "fa" ? "fa" : "en",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => onTokenRef.current(""));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey, language]);

  if (!turnstileSiteKey) return null;
  return <div ref={container} className="min-h-[65px]" />;
}
