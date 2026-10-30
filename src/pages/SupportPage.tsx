import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Captcha } from "@/components/Captcha";
import { PageIntro } from "@/components/PageIntro";
import { useLanguage } from "@/hooks/useLanguage";
import { createPublicTicket } from "@/api/support";

const inputClass = "w-full rounded-xl border border-bun-line bg-bun-paper px-4 py-3 text-sm text-bun-text outline-none focus:border-bun-accent focus:ring-2 focus:ring-bun-accent/20";

export default function SupportPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [created, setCreated] = useState<{ trackingCode: string; title: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (!captchaToken) { setFeedback(t("support.captcha")); return; }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("attachment");
    if (file instanceof File && file.size > 4 * 1024 * 1024) { setFeedback(t("support.error")); return; }
    setBusy(true);
    try {
      const result = await createPublicTicket({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "other"),
        message: String(form.get("message") ?? ""),
        orderNumber: String(form.get("orderNumber") ?? ""),
        captchaToken,
        attachment: file instanceof File && file.size ? file : null,
      });
      setCreated({ trackingCode: result.trackingCode, title: result.ticket.title });
      formElement.reset();
    } catch {
      setFeedback(t("support.error"));
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaReset((value) => value + 1);
    }
  }

  return <>
    <PageIntro kicker={t("nav.support")} title={t("support.title")} description={t("support.description")} />
    <main className="bg-bun-paper py-12 sm:py-16" dir={language === "fa" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3"><span className="rounded-full bg-bun-accent px-4 py-2 text-sm font-bold text-white">{t("support.newTab")}</span><Link to="/support/track" className="rounded-full border border-bun-line px-4 py-2 text-sm font-bold text-bun-text hover:border-bun-accent">{t("support.trackTab")}</Link><Link to="/faq" className="ms-auto self-center text-sm font-bold text-bun-accent hover:underline">{t("support.faqLink")}</Link></div>
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-bun-line bg-bun-surface p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">{t("support.name")}<input name="name" autoComplete="name" required minLength={2} maxLength={120} className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold">{t("support.phone")}<input name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required minLength={8} maxLength={20} className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold">{t("support.subject")}<input name="title" required minLength={3} maxLength={160} className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold">{t("support.category")}<select name="category" className={inputClass}><option value="order">{t("support.order")}</option><option value="payment">{t("support.payment")}</option><option value="delivery">{t("support.delivery")}</option><option value="product">{t("support.product")}</option><option value="other">{t("support.other")}</option></select></label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">{t("support.orderNumber")}<input name="orderNumber" maxLength={80} dir="ltr" className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">{t("support.message")}<textarea name="message" required minLength={5} maxLength={5000} rows={6} className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">{t("support.attachment")}<input name="attachment" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm text-bun-muted file:me-3 file:rounded-full file:border-0 file:bg-bun-paper file:px-4 file:py-2 file:font-bold file:text-bun-text" /></label>
          </div>
          <Captcha onToken={setCaptchaToken} resetKey={captchaReset} />
          <button type="submit" disabled={busy || !captchaToken} className="w-full rounded-full bg-bun-accent px-6 py-3 font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? t("common.loading") : t("support.submit")}</button>
          {feedback && <p role="alert" className="text-sm text-bun-accent">{feedback}</p>}
        </form>
        {created && <section className="space-y-3 rounded-3xl border border-bun-accent/40 bg-bun-accent/5 p-6" aria-live="polite"><h2 className="font-black text-bun-text">{t("support.success")}</h2><p className="text-sm text-bun-muted">{created.title}</p><p className="text-sm">{t("support.trackingCode")}: <strong className="rounded-lg bg-bun-surface px-3 py-2 font-mono text-lg" dir="ltr">{created.trackingCode}</strong></p><p className="text-sm text-bun-muted">{t("support.trackingHint")}</p><Link to="/support/track" className="inline-flex rounded-full bg-bun-accent px-5 py-2 font-bold text-white">{t("support.trackTab")}</Link></section>}
      </div>
    </main>
  </>;
}
