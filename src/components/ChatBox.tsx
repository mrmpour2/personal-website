import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageCircle, Plus, Send, ShoppingBag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { apiBaseUrl, apiClient } from "@/api/client";
import { fetchPublicMenu, peekPublicMenu } from "@/api/menu";
import { Button } from "@/components/ui/Button";
import { MenuItemImage } from "@/components/MenuItemImage";
import { useCart } from "@/context/CartContext";
import { useRestaurantAvailability } from "@/context/RestaurantAvailabilityContext";
import { defaultVariant, formatPrice, hasVariants, priceRange } from "@/data/content";
import { useLanguage } from "@/hooks/useLanguage";
import { useSmoothScrollPause } from "@/hooks/useSmoothScrollPause";
import type { MenuItem } from "@/types";
import { cn } from "@/utils/cn";

type QueuedChatMessage = { id: string; text: string };
const MAX_CHAT_MESSAGE_LENGTH = 4000;
const MAX_CHAT_CONTEXT_MESSAGES = 40;
const CHAT_TAB_KEY = "elin-chat-tab-id";
const CHAT_CONVERSATION_KEY = "elin-chat-conversation-id";

function getChatTabId(): string {
  try {
    const existing = sessionStorage.getItem(CHAT_TAB_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,100}$/.test(existing)) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(CHAT_TAB_KEY, next);
    return next;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * دستیار گفتگوی شیش برگر الین.
 *
 * این کامپوننت مسئول گفتگو است، نه سفارش: دکمه «محصولات فروشگاه» فهرست زنده را
 * نشان می‌دهد و هر آیتم را به **سبد سراسری سایت** اضافه می‌کند
 * (`@/context/CartContext`). پیش از این یک سبد و فرم پرداخت جداگانه داخل همین
 * کامپوننت بود که با سبد سایت هم‌خوان نبود و متن‌هایش هم هاردکد فارسی بودند؛
 * حالا پرداخت فقط در `/checkout` انجام می‌شود تا یک مسیر واحد وجود داشته باشد.
 *
 * گفتگو با `POST /api/chat` (استریم) کار می‌کند و تاریخچه از نشست کوکی امن
 * `GET /api/chat/conversation` بازیابی می‌شود.
 */

/** پیام استخراج‌شده از `parts` برای نمایش. */
function messageText(message: { parts?: Array<{ type: string; text?: string }> }): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("") ?? ""
  );
}

function loadGuestConversation(tabId: string) {
  const load = async () => {
    await apiClient.get("/chat/session", { withCredentials: true });
    const conversationId = (() => {
      try {
        return sessionStorage.getItem(CHAT_CONVERSATION_KEY);
      } catch {
        return null;
      }
    })();
    const request = (id: string | null) =>
      apiClient.get("/chat/conversation", {
        withCredentials: true,
        headers: {
          "X-Chat-Tab-Id": tabId,
          ...(id ? { "X-Chat-Conversation-Id": id } : {}),
        },
      });
    try {
      return await request(conversationId);
    } catch (error) {
      if (!conversationId || (error as { response?: { status?: number } })?.response?.status !== 404) throw error;
      try {
        sessionStorage.removeItem(CHAT_CONVERSATION_KEY);
      } catch {
        // A new server-owned tab conversation can still be loaded without storage.
      }
      return request(null);
    }
  };
  if (navigator.locks) {
    return navigator.locks
      .request("elin-chat-session-bootstrap", load)
      .then(async (response) => await response);
  }
  return load();
}

export default function ChatBox() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { addItem, count, openCart } = useCart();
  const { availability, unavailable } = useRestaurantAvailability();
  const [tabId] = useState(() => getChatTabId());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useSmoothScrollPause(open);
  const [input, setInput] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [addedId, setAddedId] = useState<string | null>(null);
  const pendingKey = "elin-chat-pending";
  const [pendingQueue, setPendingQueue] = useState<QueuedChatMessage[]>(() => {
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(pendingKey) ?? "[]");
      return Array.isArray(parsed)
        ? parsed.filter((item): item is QueuedChatMessage =>
            item &&
              typeof item.id === "string" &&
              typeof item.text === "string" &&
              item.text.length <= MAX_CHAT_MESSAGE_LENGTH,
          ).slice(0, 10)
        : [];
    } catch {
      return [];
    }
  });
  const [chatHydrated, setChatHydrated] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [conversationActionError, setConversationActionError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const addedTimer = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const sendingMessageIdRef = useRef<string | null>(null);
  const blockedQueueItemRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const newConversationRequestIdRef = useRef<string | null>(null);

  // زبان از طریق ref خوانده می‌شود تا transport یک‌بار ساخته شود ولی هر پیام با
  // آخرین زبان انتخاب‌شده برود (`body` می‌تواند تابع باشد).
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const translateRef = useRef(t);
  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${apiBaseUrl}/chat`,
        credentials: "include",
        body: () => ({ language: languageRef.current }),
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            tabId,
            conversationId: conversationIdRef.current,
            messages: messages.slice(-MAX_CHAT_CONTEXT_MESSAGES),
          },
        }),
      }),
    [tabId],
  );

  const { messages, sendMessage, regenerate, status, setMessages, error, clearError } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  /**
   * تاریخچه نشست از سرور بازیابی می‌شود.
   *
   * اگر نشست تازه باشد (پیام ذخیره‌شده‌ای نیست) هم پیام خوشامد نمایش داده
   * می‌شود؛ پیش از این فقط در حالت خطای درخواست این کار انجام می‌شد و کاربر با
   * یک پنجره کاملاً خالی روبه‌رو می‌شد.
   */
  useEffect(() => {
    let cancelled = false;
    const greeting = () => ({
      id: "greeting",
      role: "assistant" as const,
      parts: [{ type: "text" as const, text: translateRef.current("chat.greeting") }],
    });

    loadGuestConversation(tabId)
      .then(({ data }) => {
        if (cancelled) return;
        const activeId = typeof data.conversationId === "string" ? data.conversationId : null;
        conversationIdRef.current = activeId;
        setConversationId(activeId);
        try {
          if (activeId) sessionStorage.setItem(CHAT_CONVERSATION_KEY, activeId);
          else sessionStorage.removeItem(CHAT_CONVERSATION_KEY);
        } catch {
          // The server can still bind an active conversation to this tab for this page load.
        }
        const stored: Array<{ id: string; role: "user" | "assistant"; content: string }> = Array.isArray(data.messages)
          ? data.messages
          : [];
        if (stored.length === 0) {
          setMessages([greeting()]);
          setChatHydrated(true);
          return;
        }
        setMessages(
          stored.map((message) => ({
            id: message.id,
            role: message.role,
            parts: [{ type: "text" as const, text: message.content }],
          })),
        );
        setChatHydrated(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMessages([greeting()]);
          setChatHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setMessages, tabId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(pendingKey, JSON.stringify(pendingQueue));
    } catch {
      return;
    }
  }, [pendingKey, pendingQueue]);

  useEffect(() => {
    if (isLoading) return;
    if (error && pendingQueue.length > 0) {
      blockedQueueItemRef.current = pendingQueue[0].id;
      sendingRef.current = false;
      sendingMessageIdRef.current = null;
      return;
    }
    const queuedMessage = pendingQueue[0];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (
      chatHydrated &&
      queuedMessage &&
      messages.at(-1)?.role === "assistant" &&
      lastUserMessage?.id === queuedMessage.id
    ) {
      // Lock this completed item until the queue state advances. This also
      // clears a stale sessionStorage retry after a refresh without resending.
      sendingRef.current = true;
      sendingMessageIdRef.current = queuedMessage.id;
      setPendingQueue((queue) => queue[0]?.id === queuedMessage.id ? queue.slice(1) : queue);
      blockedQueueItemRef.current = null;
    }
  }, [chatHydrated, error, isLoading, messages, pendingQueue]);

  useEffect(() => {
    const nextMessage = pendingQueue[0];
    if (!chatHydrated || isLoading || error) return;
    if (!nextMessage) {
      sendingRef.current = false;
      sendingMessageIdRef.current = null;
      return;
    }
    if (sendingRef.current) {
      if (sendingMessageIdRef.current === nextMessage.id) return;
      sendingRef.current = false;
      sendingMessageIdRef.current = null;
    }
    if (blockedQueueItemRef.current === nextMessage.id) return;

    sendingRef.current = true;
    sendingMessageIdRef.current = nextMessage.id;
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const request = lastUserMessage?.id === nextMessage.id
      ? regenerate()
      : sendMessage({
          id: nextMessage.id,
          role: "user",
          parts: [{ type: "text", text: nextMessage.text }],
        });
    void request.catch(() => {
      blockedQueueItemRef.current = nextMessage.id;
      sendingRef.current = false;
      sendingMessageIdRef.current = null;
    });
  }, [chatHydrated, error, isLoading, messages, pendingQueue, regenerate, retryAttempt, sendMessage]);

  // فهرست زنده از همان کش صفحه منو می‌آید، پس درخواست تکراری زده نمی‌شود.
  const toggleCatalog = useCallback(() => {
    setCatalogOpen((value) => !value);
    const cached = peekPublicMenu();
    if (cached) {
      setProducts(cached.filter((item) => item.productId));
      setCatalogStatus("ready");
      return;
    }
    if (catalogStatus === "loading") return;
    setProducts([]);
    setCatalogStatus("loading");
    fetchPublicMenu()
      .then((items) => {
        setProducts(items.filter((item) => item.productId));
        setCatalogStatus("ready");
      })
      .catch(() => {
        setProducts([]);
        setCatalogStatus("error");
      });
  }, [catalogStatus]);

  const addProduct = useCallback(
    (item: MenuItem) => {
      // آیتم دارای سایز با سایز پیش‌فرض اضافه می‌شود؛ تغییر سایز در صفحه محصول
      // انجام می‌شود تا این پنل ساده بماند.
      if (!addItem(item, 1, defaultVariant(item)?.key, [], conversationIdRef.current ?? undefined)) return;
      setAddedId(item.productId ?? null);
      if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
      addedTimer.current = window.setTimeout(() => setAddedId(null), 1600);
    },
    [addItem],
  );

  useEffect(
    () => () => {
      if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
    },
    [],
  );

  // اسکرول خودکار
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, catalogOpen]);

  const send = useCallback(() => {
    const value = input.trim().slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!value || pendingQueue.length >= 10) return;

    setPendingQueue((queue) => [...queue, { id: crypto.randomUUID(), text: value }]);
    setInput("");
  }, [input, pendingQueue.length]);

  const retryPending = useCallback(() => {
    if (pendingQueue.length === 0 || isLoading) return;
    clearError();
    blockedQueueItemRef.current = null;
    sendingRef.current = false;
    sendingMessageIdRef.current = null;
    setRetryAttempt((attempt) => attempt + 1);
  }, [clearError, isLoading, pendingQueue.length]);

  const startNewConversation = useCallback(async () => {
    if (!chatHydrated || isLoading || pendingQueue.length > 0 || creatingConversation) return;
    setCreatingConversation(true);
    setConversationActionError(false);
    try {
      const requestId = newConversationRequestIdRef.current ?? crypto.randomUUID();
      newConversationRequestIdRef.current = requestId;
      const { data } = await apiClient.post(
        "/chat/conversations",
        { tabId, requestId },
        { withCredentials: true },
      );
      const nextId = typeof data.conversationId === "string" ? data.conversationId : null;
      if (!nextId) throw new Error("Conversation identifier was not returned.");
      conversationIdRef.current = nextId;
      newConversationRequestIdRef.current = null;
      setConversationId(nextId);
      try {
        sessionStorage.setItem(CHAT_CONVERSATION_KEY, nextId);
      } catch {
        // The request still carries this tab's in-memory conversation id.
      }
      setMessages([{
        id: "greeting",
        role: "assistant",
        parts: [{ type: "text", text: translateRef.current("chat.greeting") }],
      }]);
      clearError();
      setCatalogOpen(false);
    } catch {
      setConversationActionError(true);
    } finally {
      setCreatingConversation(false);
    }
  }, [chatHydrated, clearError, creatingConversation, isLoading, pendingQueue.length, setMessages, tabId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    },
    [send],
  );

  return (
    <div
      className={cn(
        "fixed bottom-4 z-50 sm:bottom-6",
        language === "fa" ? "left-4 sm:left-6" : "right-4 sm:right-6",
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.section
            key="chat-window"
            role="dialog"
            aria-label={t("chat.title")}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mb-3 flex h-[min(70vh,520px)] max-h-[calc(100dvh-6rem)] w-[min(calc(100vw-2rem),360px)] origin-bottom flex-col overflow-hidden rounded-[1.5rem] border border-bun-line bg-bun-paper shadow-2xl shadow-black/20"
          >
            <header className="flex items-center justify-between bg-gradient-to-r from-bun-burgundy to-bun-red px-4 py-3.5 text-white">
              <div>
                <h2 className="text-sm font-black">{t("chat.title")}</h2>
                <p className="mt-0.5 text-[11px] text-white/70">{t("chat.status")}</p>
              </div>
              <Button
                variant="icon"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label={t("chat.close")}
                className="size-9 text-white hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </header>

            <div className="flex flex-wrap items-center gap-2 border-b border-bun-line px-3 py-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={startNewConversation}
                disabled={!conversationId || isLoading || pendingQueue.length > 0 || creatingConversation}
                className="gap-1.5 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {creatingConversation ? t("common.loading") : t("chat.newConversation")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleCatalog}
                aria-expanded={catalogOpen}
                className="gap-1.5 text-xs"
              >
                <ShoppingBag className="size-3.5" aria-hidden="true" />
                {t("chat.catalog")}
              </Button>
              {count > 0 ? (
                <Button type="button" size="sm" onClick={openCart} className="gap-1.5 text-xs">
                  {t("chat.viewCart", { count })}
                </Button>
              ) : null}
            </div>

            <div data-lenis-prevent className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4" aria-live="polite">
              {catalogOpen ? (
                <section className="space-y-2" aria-label={t("chat.catalogTitle")}>
                  <h3 className="text-sm font-bold text-bun-text">{t("chat.catalogTitle")}</h3>
                  <p role="status" className={cn(
                    "rounded-lg px-2.5 py-2 text-xs leading-5",
                    unavailable || availability?.status === "SETUP_REQUIRED"
                      ? "bg-red-50 text-red-900"
                      : availability?.acceptsOrders
                        ? "bg-emerald-50 text-emerald-900"
                        : "bg-amber-50 text-amber-950",
                  )}>
                    {unavailable
                      ? language === "fa" ? "وضعیت پذیرش سفارش قابل بررسی نیست؛ فعلاً سفارش تازه ثبت نمی‌شود." : "Ordering status cannot be checked; new orders are paused."
                      : !availability
                        ? language === "fa" ? "در حال بررسی وضعیت پذیرش سفارش…" : "Checking order availability…"
                        : availability.status === "SETUP_REQUIRED"
                          ? language === "fa" ? "ساعات واقعی رستوران هنوز فعال نشده است؛ سفارش تازه پذیرفته نمی‌شود." : "The restaurant's actual opening hours are not active yet; new orders are unavailable."
                          : availability.acceptsOrders
                            ? language === "fa" ? "رستوران اکنون سفارش آنلاین می‌پذیرد." : "The restaurant is accepting online orders now."
                            : availability.reasonCode === "GLOBAL_STOP"
                              ? language === "fa" ? "پذیرش سفارش با توقف سراسری موقتاً متوقف شده است؛ سبد شما محفوظ می‌ماند." : "Ordering is temporarily paused by the restaurant; your cart will remain available."
                              : availability.reasonCode === "MANUAL_OVERRIDE"
                                ? language === "fa" ? "پذیرش سفارش طبق تنظیم موقت مدیر بسته است؛ سبد شما محفوظ می‌ماند." : "Ordering is temporarily closed by a manager override; your cart will remain available."
                                : language === "fa" ? "رستوران اکنون سفارش تازه نمی‌پذیرد؛ سبد شما برای بعد محفوظ می‌ماند." : "The restaurant is closed to new orders; your cart will remain available for later."}
                  </p>
                  {catalogStatus === "loading" ? (
                    <p className="text-xs text-bun-muted">{t("common.loading")}</p>
                  ) : null}
                  {catalogStatus === "error" ? (
                    <p role="status" className="text-xs font-bold text-bun-muted">
                      {t("chat.catalogError")}
                    </p>
                  ) : null}
                  {catalogStatus === "ready" && products.length === 0 ? (
                    <p className="text-xs text-bun-muted">{t("menuPage.empty")}</p>
                  ) : null}
                  {products.map((product) => (
                    <article
                      key={product.productId}
                      className="flex items-center gap-3 rounded-xl border border-bun-line bg-bun-surface p-2.5"
                    >
                      <MenuItemImage
                        item={product}
                        sizes="56px"
                        reveal={false}
                        className="size-14 shrink-0 rounded-lg"
                        imageClassName="size-full"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-bun-text">{product.name[language]}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-bun-muted">
                          {product.description[language]}
                        </p>
                        <p className="mt-1 text-xs font-bold text-bun-accent">
                          {hasVariants(product)
                            ? t("product.from", {
                                price: formatPrice(priceRange(product).min, language),
                              })
                            : formatPrice(product.price, language)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        aria-label={`${t("cart.add")}: ${product.name[language]}`}
                        className={cn(
                          "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-bun-gold",
                          addedId === product.productId
                            ? "bg-bun-orange text-bun-ink"
                            : "bg-bun-paper text-bun-text hover:bg-bun-orange/15 hover:text-bun-accent",
                        )}
                      >
                        {addedId === product.productId ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          <Plus className="size-4" aria-hidden="true" />
                        )}
                      </button>
                    </article>
                  ))}
                </section>
              ) : null}

              {messages.map((message) => {
                const text = messageText(message);
                if (!text) return null;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                      message.role === "assistant"
                        ? "bg-bun-surface text-bun-text"
                        : "ms-auto bg-bun-red text-white",
                    )}
                  >
                    {text}
                  </div>
                );
              })}

              {error || pendingQueue.length > 0 || conversationActionError ? (
                <div role={error || conversationActionError ? "alert" : "status"} className="space-y-2 rounded-xl bg-bun-surface p-3 text-xs text-bun-text">
                  <p>
                    {error
                      ? t("chat.sendError")
                      : conversationActionError
                        ? t("chat.newConversationError")
                        : t("chat.pending", { count: pendingQueue.length })}
                  </p>
                  {pendingQueue.length > 0 && !isLoading ? (
                    <Button type="button" size="sm" variant="secondary" onClick={retryPending}>
                      {t("chat.retry")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {isLoading && messages.at(-1)?.role === "user" ? (
                <div
                  className="flex w-fit items-center gap-1 rounded-2xl bg-bun-surface px-4 py-3"
                  aria-label={t("chat.typing")}
                >
                  {[0, 1, 2].map((index) => (
                    <motion.span
                      key={index}
                      className="size-1.5 rounded-full bg-bun-muted"
                      animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                      transition={{ duration: 0.75, repeat: Infinity, delay: index * 0.12 }}
                    />
                  ))}
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex gap-2 border-t border-bun-line p-3"
            >
              <label htmlFor="chat-message" className="sr-only">
                {t("chat.placeholder")}
              </label>
              <input
                id="chat-message"
                value={input}
                maxLength={MAX_CHAT_MESSAGE_LENGTH}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                className="min-w-0 flex-1 rounded-full border border-bun-line bg-bun-surface px-4 text-sm text-bun-text outline-none placeholder:text-bun-muted focus:border-bun-orange focus:ring-2 focus:ring-bun-orange/20"
                aria-describedby="chat-help"
              />
              <p id="chat-help" className="sr-only">
                {t("chat.placeholder")}
              </p>
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || pendingQueue.length >= 10}
                aria-label={t("chat.send")}
              >
                <Send
                  className={cn("size-4", language === "fa" && "rotate-180")}
                  aria-hidden="true"
                />
              </Button>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
        <Button
          onClick={() => setOpen((value) => !value)}
          size="icon"
          aria-label={open ? t("chat.close") : t("chat.open")}
          aria-expanded={open}
          className="relative size-14 shadow-xl shadow-bun-orange/30"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <MessageCircle className="size-5" aria-hidden="true" />}
          {!open && count > 0 ? (
            <span className="absolute end-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-bun-ink px-1 text-[10px] font-black leading-5 text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </motion.div>
    </div>
  );
}
