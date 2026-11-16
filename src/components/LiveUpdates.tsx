import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiBaseUrl } from "@/api/client";
import { apiClient } from "@/api/client";
import { patchPublicMenuProduct } from "@/api/menu";

interface CampaignNotice {
  id: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  endsAt?: string | null;
}

interface RealtimeEvent {
  id?: string;
  type?: string;
  data?: Record<string, unknown>;
}

export function LiveUpdates() {
  const [campaign, setCampaign] = useState<CampaignNotice | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | undefined;
    let reconnectTimer = 0;
    let lastEventId = "";
    let delay = 1000;
    let noticeTimer = 0;
    const seen = new Set<string>();
    const hiddenKey = (id: string) => `campaign:hidden:${id}`;
    const maybeShow = (value: CampaignNotice | null) => {
      if (value && localStorage.getItem(hiddenKey(value.id)) !== "true") setCampaign(value);
      else setCampaign(null);
    };

    void apiClient.get<{ campaign: CampaignNotice | null }>("/public/active-campaign")
      .then(({ data }) => { if (!stopped) maybeShow(data.campaign); })
      .catch(() => undefined);

    const consume = (event: RealtimeEvent) => {
      if (!event.id || seen.has(event.id)) return;
      seen.add(event.id);
      if (seen.size > 500) seen.delete(seen.values().next().value as string);
      if (event.type === "realtime.resync") {
        window.dispatchEvent(new CustomEvent("realtime:resync"));
        window.dispatchEvent(new Event("realtime:restaurant-availability"));
        void apiClient.get<{ campaign: CampaignNotice | null }>("/public/active-campaign").then(({ data }) => maybeShow(data.campaign)).catch(() => undefined);
        return;
      }
      if (event.type === "restaurant.availability.changed") {
        window.dispatchEvent(new Event("realtime:restaurant-availability"));
      }
      if (event.type === "product.updated" && typeof event.data?.id === "string" && typeof event.data.changes === "object" && event.data.changes !== null) {
        const detail = { productId: event.data.id, changes: event.data.changes as Record<string, unknown> };
        patchPublicMenuProduct(detail.productId, detail.changes);
        window.dispatchEvent(new CustomEvent("realtime:product", { detail }));
      }
      if (event.type === "campaign.activated") maybeShow(event.data as unknown as CampaignNotice);
      if (event.type === "campaign.deactivated") setCampaign((current) => current?.id === event.data?.id ? null : current);
    };

    async function connect() {
      while (!stopped) {
        try {
          controller = new AbortController();
          const headers: Record<string, string> = { Accept: "text/event-stream" };
          if (lastEventId) headers["Last-Event-ID"] = lastEventId;
          const response = await fetch(`${apiBaseUrl}/realtime/public`, { headers, signal: controller.signal });
          if (!response.ok || !response.body) throw new Error("Realtime stream unavailable");
          delay = 1000;
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const frame of frames) {
              const id = frame.match(/^id: (.+)$/m)?.[1];
              const data = frame.match(/^data: (.+)$/m)?.[1];
              if (id) lastEventId = id;
              if (data) { try { consume(JSON.parse(data) as RealtimeEvent); } catch { /* Ignore malformed frames. */ } }
            }
          }
        } catch { /* Retry below with backoff and resume cursor. */ }
        if (!stopped) {
          await new Promise<void>((resolve) => { reconnectTimer = window.setTimeout(resolve, delay + Math.random() * 500); });
          delay = Math.min(30_000, delay * 2);
        }
      }
    }
    void connect();
    const onCartUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ name: string; change: string }>).detail;
      setNotice(detail.change === "price" ? `قیمت «${detail.name}» تغییر کرد؛ مبلغ سبد به‌روز شد.` : `موجودی «${detail.name}» تغییر کرد؛ تعداد سبد اصلاح شد.`);
      window.clearTimeout(noticeTimer);
      noticeTimer = window.setTimeout(() => setNotice(""), 5000);
    };
    window.addEventListener("realtime:cart-catalog-change", onCartUpdate);
    return () => {
      stopped = true;
      controller?.abort();
      window.clearTimeout(reconnectTimer);
      window.clearTimeout(noticeTimer);
      window.removeEventListener("realtime:cart-catalog-change", onCartUpdate);
    };
    // Campaign identity is updated through the stream; reconnects resume from the last event ID.
  }, []);

  return <>
    {campaign && <aside dir="rtl" className="live-campaign-banner fixed inset-x-0 top-0 z-[120] border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-md" aria-label="کمپین فعال">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="min-w-0"><strong className="block">{campaign.title}</strong><span className="text-sm">{campaign.description}</span></div>
        <div className="flex shrink-0 items-center gap-3"><Link to={campaign.ctaUrl || "/menu"} className="rounded-full bg-amber-800 px-4 py-2 text-sm font-bold text-white">{campaign.ctaLabel || "مشاهده منو"}</Link><button type="button" aria-label="بستن بنر کمپین" onClick={() => { localStorage.setItem(`campaign:hidden:${campaign.id}`, "true"); setCampaign(null); }} className="rounded-full px-2 py-1 text-xl" >×</button></div>
      </div>
    </aside>}
    {notice && <div dir="rtl" role="status" className="fixed bottom-24 start-4 z-[130] max-w-sm rounded-xl bg-bun-text px-4 py-3 text-sm text-white shadow-lg">{notice}</div>}
  </>;
}
