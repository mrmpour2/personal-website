import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Captcha } from "@/components/Captcha";
import { PageIntro } from "@/components/PageIntro";
import { useLanguage } from "@/hooks/useLanguage";
import { replyPublicTicket, trackPublicTicket } from "@/api/support";

const inputClass = "w-full rounded-xl border border-bun-line bg-bun-paper px-4 py-3 text-sm text-bun-text outline-none focus:border-bun-accent focus:ring-2 focus:ring-bun-accent/20";

export default function TicketTrackingPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const date = new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" });
  const [phone, setPhone] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [ticket, setTicket] = useState<Awaited<ReturnType<typeof trackPublicTicket>> | null>(null);
  const [reply, setReply] = useState("");
  const [feedback, setFeedback] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
      const next = await trackPublicTicket(phone.trim(), trackingCode.trim().toUpperCase());
      setTicket(next);
      setTrackingCode(next.trackingCode);
    } catch {
      setTicket(null);
      setFeedback(t("support.error"));
    } finally { setBusy(false); }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captchaToken) { setFeedback(t("support.captcha")); return; }
    setBusy(true);
    setFeedback("");
    try {
      await replyPublicTicket({ phone: phone.trim(), trackingCode: trackingCode.trim().toUpperCase(), content: reply.trim(), captchaToken });
      setReply("");
      setFeedback(t("support.success"));
      const next = await trackPublicTicket(phone.trim(), trackingCode.trim().toUpperCase());
      setTicket(next);
    } catch {
      setFeedback(t("support.error"));
    } finally {
      setBusy(false);
      setCaptchaToken("");
      setCaptchaReset((value) => value + 1);
    }
  }

  const labels: Record<string, string> = { OPEN: t("support.new"), IN_PROGRESS: t("support.inProgress"), RESOLVED: t("support.answered"), CLOSED: t("support.closed") };

  return <>
    <PageIntro kicker={t("nav.support")} title={t("support.trackTab")} description={t("support.trackingHint")} />
    <main className="bg-bun-paper py-12 sm:py-16" dir={language === "fa" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3"><Link to="/support" className="rounded-full border border-bun-line px-4 py-2 text-sm font-bold text-bun-text">{t("support.newTab")}</Link><span className="rounded-full bg-bun-accent px-4 py-2 text-sm font-bold text-white">{t("support.trackTab")}</span></div>
        <form onSubmit={lookup} className="grid gap-4 rounded-3xl border border-bun-line bg-bun-surface p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-7">
          <label className="grid gap-2 text-sm font-bold">{t("support.phone")}<input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
          <label className="grid gap-2 text-sm font-bold">{t("support.trackingCode")}<input required minLength={10} maxLength={10} dir="ltr" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} className={`${inputClass} font-mono uppercase`} /></label>
          <button type="submit" disabled={busy} className="rounded-full bg-bun-accent px-6 py-3 font-black text-white disabled:opacity-50">{busy ? t("common.loading") : t("support.track")}</button>
        </form>
        {feedback && <p role="status" className="rounded-xl border border-bun-line bg-bun-surface p-4 text-sm text-bun-muted">{feedback}</p>}
        {ticket && <section className="space-y-5 rounded-3xl border border-bun-line bg-bun-surface p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-bun-text">{ticket.title}</h2><p className="mt-1 text-xs text-bun-muted">{date.format(new Date(ticket.createdAt))}</p></div><span className="rounded-full bg-bun-accent/10 px-4 py-2 text-sm font-bold text-bun-accent">{labels[ticket.status] || ticket.status}</span></div>
          <div className="space-y-3" data-lenis-prevent>{ticket.messages.length ? ticket.messages.map((message) => <article key={message.id} className="rounded-2xl border border-bun-line p-4"><div className="flex flex-wrap justify-between gap-2 text-xs text-bun-muted"><span>{message.sender === "STAFF" ? t("nav.support") : t("support.name")}</span><time>{date.format(new Date(message.createdAt))}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-bun-text">{message.content}</p></article>) : <p className="text-sm text-bun-muted">{t("support.noMessages")}</p>}</div>
          {ticket.status !== "CLOSED" && <form onSubmit={sendReply} className="space-y-4 border-t border-bun-line pt-5"><label className="grid gap-2 text-sm font-bold">{t("support.reply")}<textarea value={reply} onChange={(event) => setReply(event.target.value)} required maxLength={3000} rows={4} className={inputClass} /></label><Captcha onToken={setCaptchaToken} resetKey={captchaReset} /><button type="submit" disabled={busy || !captchaToken} className="rounded-full bg-bun-accent px-6 py-3 font-black text-white disabled:opacity-50">{busy ? t("common.loading") : t("support.sendReply")}</button></form>}
        </section>}
      </div>
    </main>
  </>;
}
