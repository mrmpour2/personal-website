import { ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageIntro } from "@/components/PageIntro";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { Button, buttonVariants } from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { useLoyalty } from "@/context/LoyaltyContext";
import {
  createOrder,
  confirmCashOnDelivery,
  requestCheckoutOtp,
  verifyCheckoutOtp,
  readCheckoutOrder,
  cancelCheckoutOrder,
  errorMessageFrom,
  fetchPaymentConfig,
  errorCodeFrom,
  type PaymentConfig,
  type PaymentMethod,
} from "@/api/orders";
import { formatPrice, pointsForAmount } from "@/data/content";
import { useLanguage } from "@/hooks/useLanguage";
import { forgetPendingOrder, peekPendingOrder, rememberPendingOrder } from "@/utils/orderReward";
import { isValidPhone } from "@/utils/phone";
import { getChatSessionId } from "@/utils/session";
import { cn } from "@/utils/cn";

/**
 * «اثر انگشت» سبد: کلید و تعداد هر سطر.
 *
 * سفارشی که ساخته می‌شود مبلغ و اقلام همان لحظه را قفل می‌کند؛ اگر مشتری بعد از
 * ساخت سفارش چیزی به سبد اضافه یا کم
 * کند، باید سفارش تازه ساخته شود، وگرنه مبلغی که می‌بیند با سفارش ثبت‌شده فرق
 * می‌کند.
 */
function cartFingerprint(lines: { key: string; quantity: number }[]): string {
  return lines
    .map((line) => `${line.key}x${line.quantity}`)
    .sort()
    .join("|");
}

const inputClass =
  "h-14 w-full rounded-2xl border border-bun-line bg-bun-surface px-5 text-bun-text outline-none transition-colors placeholder:text-bun-muted focus:border-bun-orange focus:ring-2 focus:ring-bun-orange/20";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-black text-bun-text">
        {label}
      </label>
      {children}
    </div>
  );
}

type MessageTone = "error" | "info" | "success";

interface CompletedOrder {
  orderNumber: string;
  total: number;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { lines, total, clear } = useCart();
  const { member } = useLoyalty();

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configFailed, setConfigFailed] = useState(false);
  const method: PaymentMethod = "CASH_ON_DELIVERY";
  const [name, setName] = useState(member?.name ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  // کپچا فقط وقتی سرور CAPTCHA_REQUIRED برگرداند نمایش داده می‌شود (بعد از چند تلاش/درخواست).
  const [captchaNeeded, setCaptchaNeeded] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [reservationExpiry, setReservationExpiry] = useState<string | null>(null);
  const [reservedCartKey, setReservedCartKey] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [orderKey, setOrderKey] = useState(() => {
    const existing = sessionStorage.getItem("checkout-idempotency");
    if (existing) return existing;
    const key = crypto.randomUUID(); sessionStorage.setItem("checkout-idempotency", key); return key;
  });
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: MessageTone; text: string } | null>(null);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);
  /** سفارش در حال پیگیری کاربر. */
  const [pendingOrder, setPendingOrder] = useState<{ id: string; orderNumber: string; total: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetchPaymentConfig()
      .then((value) => {
        if (!active) return;
        setConfig(value);
      })
      .catch(() => {
        if (active) setConfigFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // سفارش نیمه‌کاره: همان را دوباره پیگیری می‌کنیم — ولی
  // فقط اگر سبد همان سبد آن سفارش باشد؛ سبدِ عوض‌شده باید سفارش تازه بگیرد.
  useEffect(() => {
    const stored = peekPendingOrder();
    if (!stored) return;
    if (stored.cartKey && stored.cartKey !== cartFingerprint(lines)) setMessage({ tone: "info", text: t("checkout.staleOrder") });
    setReservedCartKey(stored.cartKey ?? null);
    setPhone(stored.phone);
    setPendingOrder({ id: stored.orderId, orderNumber: stored.orderNumber, total: stored.total });
    void readCheckoutOrder(stored.orderId).then(order => {
      setReservationExpiry(order.expiresAt);
      setVerifiedPhone(stored.phone);
      if (["CANCELLED", "REFUNDED"].includes(order.status)) {
        setPendingOrder(null); setReservationExpiry(null); setReservedCartKey(null); forgetPendingOrder();
        const key = crypto.randomUUID(); setOrderKey(key); sessionStorage.setItem("checkout-idempotency", key);
      }
    }).catch(() => setVerifiedPhone(""));
    // فقط یک‌بار در mount؛ تغییر سبد نباید پیام را دوباره بسازد.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitLabel = useMemo(() => {
    if (busy) return t("checkout.busy");
    return t("checkout.submitCod");
  }, [busy, t]);

  const canSubmit =
    lines.length > 0 &&
    verifiedPhone === phone.trim() && Boolean(verifiedPhone) &&
    (!reservationExpiry || new Date(reservationExpiry).getTime() > clock) &&
    (!reservedCartKey || reservedCartKey === cartFingerprint(lines)) &&
    !busy &&
    config !== null &&
    method === "CASH_ON_DELIVERY" && config.cod.enabled;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (name.trim().length < 2) {
      setMessage({ tone: "error", text: t("checkout.errorName") });
      return;
    }
    if (!isValidPhone(phone)) {
      setMessage({ tone: "error", text: t("checkout.errorPhone") });
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setMessage({ tone: "error", text: t("checkout.errorEmail") });
      return;
    }
    if (address.trim().length < 5) {
      setMessage({ tone: "error", text: t("checkout.errorAddress") });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      // سفارش فقط یک‌بار ساخته می‌شود؛ تلاش‌های بعدی همان سفارش را پرداخت می‌کنند.
      let order = pendingOrder;
      if (!order) {
        const lineByKey = new Map(lines.map((line) => [line.key, line]));
        if (verifiedPhone !== phone.trim()) throw new Error("Mobile verification is required.");
        const created = await createOrder({
          idempotencyKey: orderKey,
          sessionId: getChatSessionId(),
          customerName: name.trim(),
          customerPhone: phone.trim(),
          ...(email.trim() ? { customerEmail: email.trim() } : {}),
          shippingAddress: address.trim(),
          items: lines.flatMap((line) => {
            const variant = line.variantId ? { variantId: line.variantId } : null;
            if (!line.parentKey) return [{ productId: line.productId, ...variant, quantity: line.quantity }];

            // مخلفات بی‌قلم اصلی هرگز فرستاده نمی‌شود (سبد خودش این حالت را
            // نمی‌سازد؛ این فقط یک محافظ است).
            const parent = lineByKey.get(line.parentKey);
            if (!parent) return [];
            return [
              {
                productId: line.productId,
                ...variant,
                quantity: line.quantity,
                parent: {
                  productId: parent.productId,
                  ...(parent.variantId ? { variantId: parent.variantId } : null),
                },
              },
            ];
          }),
        });
        order = { id: created.id, orderNumber: created.orderNumber, total: created.totalAmount };
        setPendingOrder(order);
        setReservationExpiry(created.expiresAt);
        setReservedCartKey(cartFingerprint(lines));
        rememberPendingOrder({ orderId: order.id, orderNumber: order.orderNumber, total: order.total, phone: phone.trim(), createdAt: new Date().toISOString(), cartKey: cartFingerprint(lines) });
      }

      const confirmed = await confirmCashOnDelivery(order.id);
      clear();
      forgetPendingOrder();
      setPendingOrder(null);
      setCompleted({ orderNumber: confirmed.orderNumber, total: confirmed.totalAmount });
    } catch (error) {
      setMessage({ tone: "error", text: errorMessageFrom(error, t("checkout.errorGeneric")) });
    } finally {
      setBusy(false);
    }
  };

  if (completed) {
    return (
      <>
        <PageIntro
          kicker={t("checkout.kicker")}
          title={t("checkout.successTitle")}
          description={t("checkout.successText", { orderNumber: completed.orderNumber, total: formatPrice(completed.total, language) })}
        />
        <section className="bg-bun-paper py-16 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div>
              <Link to="/menu" className={buttonVariants({ size: "lg", className: "mt-8" })}>
                {t("checkout.backToMenu")}
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageIntro
        kicker={t("checkout.kicker")}
        title={t("checkout.title")}
        description={t("checkout.description")}
      />

      <section className="bg-bun-paper py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {lines.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-[1.75rem] border border-bun-line bg-bun-surface px-8 py-14 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-bun-paper text-bun-muted">
                <ShoppingBag className="size-7" aria-hidden="true" />
              </span>
              <p className="mt-5 font-black text-bun-text">{t("checkout.empty")}</p>
              <Link to="/menu" className={buttonVariants({ className: "mt-6" })}>
                {t("cart.browseMenu")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="rounded-[1.75rem] border border-bun-line bg-bun-surface/60 p-6 sm:p-8">
                  <h2 className="font-display text-xl font-black text-bun-text">
                    {t("checkout.contact")}
                  </h2>
                  <div className="mt-6 space-y-5">
                    <Field id="checkout-name" label={t("checkout.name")}>
                      <input
                        id="checkout-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        autoComplete="name"
                        placeholder={t("checkout.namePlaceholder")}
                        className={inputClass}
                      />
                    </Field>
                    <Field id="checkout-phone" label={t("checkout.phone")}>
                      <input
                        id="checkout-phone"
                        disabled={Boolean(pendingOrder)}
                        value={phone}
                        onChange={(event) => { setPhone(event.target.value); setVerifiedPhone(""); setChallengeId(""); setPendingOrder(null); setOrderKey(crypto.randomUUID()); }}
                        type="tel"
                        inputMode="tel"
                        dir="ltr"
                        autoComplete="tel"
                        placeholder={t("checkout.phonePlaceholder")}
                        className={inputClass}
                      />
                    </Field>
                    <div className="space-y-3" aria-label="Mobile verification">
                      <Button type="button" disabled={busy || verifiedPhone === phone.trim()} onClick={async () => {
                        setBusy(true); try { setChallengeId(await requestCheckoutOtp(phone, captchaToken || undefined)); setCaptchaNeeded(false); setMessage({ tone: "info", text: language === "fa" ? "کد تأیید ارسال شد." : "Verification code requested." }); }
                        catch(error) { if (errorCodeFrom(error) === "CAPTCHA_REQUIRED") { setCaptchaNeeded(true); setMessage({ tone: "info", text: language === "fa" ? "برای ادامه، تأیید «من ربات نیستم» را کامل کنید و دوباره دکمه را بزنید." : "Please complete the human check, then try again." }); } else setMessage({ tone: "error", text: errorMessageFrom(error) }); setCaptchaToken(""); setCaptchaReset((n) => n + 1); } finally { setBusy(false); }
                      }}>{language === "fa" ? "ارسال کد تأیید موبایل" : "Send verification code"}</Button>
                      {challengeId && verifiedPhone !== phone.trim() ? <>
                        <input className={inputClass} aria-label={language === "fa" ? "کد تأیید" : "Verification code"} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpCode} onChange={e => setOtpCode(e.target.value)} />
                        <Button type="button" disabled={busy} onClick={async () => {
                          setBusy(true); try { await verifyCheckoutOtp(phone, challengeId, otpCode, captchaToken || undefined); setVerifiedPhone(phone.trim()); setOtpCode(""); setCaptchaNeeded(false); }
                          catch(error) { if (errorCodeFrom(error) === "CAPTCHA_REQUIRED") { setCaptchaNeeded(true); setMessage({ tone: "info", text: language === "fa" ? "برای ادامه، تأیید «من ربات نیستم» را کامل کنید و دوباره دکمه را بزنید." : "Please complete the human check, then try again." }); } else setMessage({ tone: "error", text: errorMessageFrom(error) }); setCaptchaToken(""); setCaptchaReset((n) => n + 1); } finally { setBusy(false); }
                        }}>{language === "fa" ? "تأیید شماره" : "Verify phone"}</Button>
                      </> : null}
                      {captchaNeeded ? <TurnstileWidget onToken={setCaptchaToken} resetKey={captchaReset} language={language === "fa" ? "fa" : "en"} /> : null}
                      {verifiedPhone === phone.trim() && verifiedPhone ? <p role="status">{language === "fa" ? "موبایل تأیید شد." : "Phone verified."}</p> : null}
                      {reservationExpiry ? <p role="status">{language === "fa" ? "رزرو تا " : "Reserved until "}{new Date(reservationExpiry).toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit" })} · {Math.floor(Math.max(0, new Date(reservationExpiry).getTime() - clock) / 60000)}:{String(Math.floor(Math.max(0, new Date(reservationExpiry).getTime() - clock) / 1000) % 60).padStart(2, "0")}</p> : null}
                      {pendingOrder ? <Button type="button" disabled={busy} onClick={async () => {
                        setBusy(true); try { await cancelCheckoutOrder(pendingOrder.id); setPendingOrder(null); setReservationExpiry(null); setReservedCartKey(null); forgetPendingOrder(); const key = crypto.randomUUID(); setOrderKey(key); sessionStorage.setItem("checkout-idempotency", key); }
                        catch(error) { setMessage({ tone: "error", text: errorMessageFrom(error) }); } finally { setBusy(false); }
                      }}>{language === "fa" ? "لغو رزرو و شروع دوباره" : "Cancel reservation and start again"}</Button> : null}
                    </div>
                    <Field id="checkout-email" label={t("checkout.email")}>
                      <input
                        id="checkout-email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder={t("checkout.emailPlaceholder")}
                        className={inputClass}
                      />
                    </Field>
                    <Field id="checkout-address" label={t("checkout.address")}>
                      <textarea
                        id="checkout-address"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        rows={3}
                        autoComplete="street-address"
                        placeholder={t("checkout.addressPlaceholder")}
                        className={cn(inputClass, "h-auto resize-y py-4 leading-7")}
                      />
                    </Field>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-bun-line bg-bun-surface/60 p-6 sm:p-8">
                  <h2 className="font-display text-xl font-black text-bun-text">
                    {t("checkout.payment")}
                  </h2>

                  {configFailed ? (
                    <p
                      role="status"
                      className="mt-5 rounded-2xl border border-bun-line bg-bun-paper px-4 py-3 text-sm font-bold text-bun-muted"
                    >
                      {t("checkout.configError")}
                    </p>
                  ) : config === null ? (
                    <p className="mt-5 text-sm font-bold text-bun-muted">{t("common.loading")}</p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      <p className="rounded-2xl border border-bun-orange/40 bg-bun-paper px-4 py-3 text-sm font-bold text-bun-text">
                        {t("checkout.codDescription")}
                      </p>
                    </div>
                  )}
                  {message ? (
                    <p
                      role="status"
                      className={cn(
                        "mt-5 rounded-2xl px-4 py-3 text-sm font-bold",
                        message.tone === "error"
                          ? "bg-bun-red/10 text-bun-red"
                          : message.tone === "success"
                            ? "bg-bun-orange/12 text-bun-accent"
                            : "bg-bun-paper text-bun-muted",
                      )}
                    >
                      {message.text}
                    </p>
                  ) : null}

                  <Button type="submit" size="lg" disabled={!canSubmit} className="mt-6 w-full">
                    {submitLabel}
                  </Button>
                </div>

              </form>

              <aside className="lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-[1.75rem] border border-bun-line bg-bun-surface p-6">
                  <h2 className="font-display text-xl font-black text-bun-text">
                    {t("checkout.summary")}
                  </h2>
                  <ul className="mt-5 space-y-3">
                    {lines
                      .filter((line) => !line.parentKey)
                      .map((line) => (
                        <li key={line.key} className="space-y-3">
                          <ul className="space-y-3">
                            <li className="flex items-start justify-between gap-4 text-sm">
                              <span className="min-w-0 flex-1 font-bold text-bun-text">
                                <span className="text-bun-muted">{line.quantity}× </span>
                                {line.name[language]}
                                {line.variantLabel ? (
                                  <span className="mt-0.5 block text-xs font-bold text-bun-accent">
                                    {line.variantLabel[language]}
                                  </span>
                                ) : null}
                              </span>
                              <span className="shrink-0 font-black text-bun-text">
                                {formatPrice(line.price * line.quantity, language)}
                              </span>
                            </li>
                            {/* مخلفات همین غذا، تورفته و با برچسب روشن. */}
                            {lines
                              .filter((candidate) => candidate.parentKey === line.key)
                              .map((addOn) => (
                                <li
                                  key={addOn.key}
                                  className="ms-4 flex items-start justify-between gap-4 text-sm"
                                >
                                  <span className="min-w-0 flex-1 font-bold text-bun-text">
                                    <span className="text-bun-muted">{addOn.quantity}× </span>
                                    {addOn.name[language]}
                                    <span className="mt-0.5 block text-[0.65rem] font-black uppercase tracking-[0.2em] text-bun-muted">
                                      {t("addOns.cartLabel")}
                                    </span>
                                  </span>
                                  <span className="shrink-0 font-black text-bun-text">
                                    {formatPrice(addOn.price * addOn.quantity, language)}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </li>
                      ))}
                  </ul>
                  <div className="mt-6 space-y-3 border-t border-bun-line pt-5 text-sm">
                    <div className="flex items-center justify-between"><span>{t("checkout.subtotal")}</span><span>{formatPrice(total, language)}</span></div>
                    <div className="flex items-center justify-between"><span>{t("checkout.tax", { rate: ((config?.vatRateBps ?? 0) / 100).toFixed(0) })}</span><span>{formatPrice(Math.round(total * (config?.vatRateBps ?? 0) / 10000), language)}</span></div>
                    <div className="flex items-center justify-between"><span>{t("checkout.delivery")}</span><span>{config ? formatPrice(config.deliveryFeeToman, language) : t("common.loading")}</span></div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-bun-line pt-4">
                    <span className="text-sm font-bold text-bun-muted">{t("checkout.total")}</span>
                    <span className="font-display text-2xl font-black text-bun-text">
                      {formatPrice(total + Math.round(total * (config?.vatRateBps ?? 0) / 10000) + (config?.deliveryFeeToman ?? 0), language)}
                    </span>
                  </div>
                  {pointsForAmount(total) > 0 ? (
                    <p className="mt-3 text-xs font-bold text-bun-accent">
                      +{pointsForAmount(total)} {t("loyalty.pointsLabel")}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs leading-5 text-bun-muted">{t("checkout.stockNote")}</p>
                  <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs underline" aria-label={t("policy.linksLabel")}>
                    <Link to="/shipping-policy">{t("policy.shippingTitle")}</Link>
                    <Link to="/return-policy">{t("policy.returnTitle")}</Link>
                    <Link to="/privacy-policy">{t("policy.privacyTitle")}</Link>
                  </nav>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
