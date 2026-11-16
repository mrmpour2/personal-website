import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/api/client";

type Survey = { products: Array<{ itemIndex: number; name: string }>; questions: Array<{ key: string; label: string; section: string }> };
const labels = ["", "بسیار ضعیف", "ضعیف", "متوسط", "خوب", "عالی"];

export default function SurveyPage() {
  const { token = "" } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Record<number, number>>({});
  const [overall, setOverall] = useState<number>();
  const [nps, setNps] = useState<number>();
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "success" | "invalid" | "expired" | "done">("loading");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let active = true;
    apiClient.get(`/public/surveys/${encodeURIComponent(token)}`)
      .then(({ data }) => { if (active) { setSurvey(data); setState("ready"); } })
      .catch((error) => { if (active) setState(error?.response?.data?.message?.includes("پایان") ? "expired" : error?.response?.status === 409 ? "done" : "invalid"); });
    return () => { active = false; };
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const hasScore = overall !== undefined
      || nps !== undefined
      || Object.keys(ratings).length > 0
      || Object.keys(products).length > 0;
    if (!hasScore) {
      setFormError("لطفاً پیش از ثبت، دست‌کم یک امتیاز انتخاب کنید.");
      return;
    }
    setFormError("");
    setBusy(true);
    try {
      await apiClient.post(`/public/surveys/${encodeURIComponent(token)}/responses`, {
        ratings, products: Object.entries(products).map(([itemIndex, rating]) => ({ itemIndex: Number(itemIndex), rating })), overall, nps, comment,
      });
      setState("success");
    } catch (error: unknown) {
      const response = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { status?: number; data?: { message?: string; code?: string } } }).response
        : undefined;
      const status = response?.status;
      const message = response?.data?.message ?? "";
      if (status === 409) setState("done");
      else if (message.includes("پایان")) setState("expired");
      else if (status === 400 || response?.data?.code === "BAD_REQUEST") {
        setFormError("پاسخ معتبر نیست. امتیازها را بررسی کنید و دوباره تلاش کنید.");
      } else setState("invalid");
    } finally { setBusy(false); }
  }

  const setRating = (key: string, value: number) => setRatings((current) => ({ ...current, [key]: value }));
  if (["loading", "success", "invalid", "expired", "done"].includes(state)) {
    const messages = { loading: "در حال دریافت نظرسنجی…", success: "سپاس از وقتی که گذاشتید. نظر شما ثبت شد.", invalid: "این پیوند نظرسنجی معتبر نیست.", expired: "مهلت تکمیل این نظرسنجی به پایان رسیده است.", done: "پاسخ این نظرسنجی قبلاً ثبت شده است." };
    return <main dir="rtl" className="mx-auto my-12 max-w-xl rounded-3xl border border-bun-line bg-bun-surface p-8 text-center shadow-xl"><h1 className="text-2xl font-bold">نظرسنجی رضایت مشتری</h1><p className="mt-5 text-bun-muted" role="status">{messages[state as keyof typeof messages]}</p></main>;
  }
  return <main dir="rtl" className="mx-auto my-8 max-w-2xl px-4 pb-12">
    <header className="rounded-3xl bg-bun-text p-7 text-white"><h1 className="text-2xl font-bold">تجربه‌تان را با ما به اشتراک بگذارید</h1><p className="mt-2 text-sm text-white/75">پاسخ به پرسش‌ها اختیاری است و به بهتر شدن خدمات ما کمک می‌کند.</p></header>
    <form onSubmit={submit} className="mt-5 space-y-4">
      {formError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
      {survey?.questions.map((question) => <fieldset key={question.key} className="rounded-2xl border border-bun-line bg-bun-surface p-5"><legend className="px-1 font-semibold">{question.label}</legend><div className="mt-3 flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={ratings[question.key] === value} onClick={() => setRating(question.key, value)} className={`rounded-xl border px-3 py-2 text-sm ${ratings[question.key] === value ? "border-bun-accent bg-bun-accent text-white" : "border-bun-line"}`}>{value} <span className="sr-only">{labels[value]}</span></button>)}</div></fieldset>)}
      {survey?.products.map((item) => <fieldset key={item.itemIndex} className="rounded-2xl border border-bun-line bg-bun-surface p-5"><legend className="px-1 font-semibold">امتیاز «{item.name}»</legend><div className="mt-3 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={products[item.itemIndex] === value} onClick={() => setProducts((old) => ({ ...old, [item.itemIndex]: value }))} className={`rounded-xl border px-3 py-2 ${products[item.itemIndex] === value ? "border-bun-accent bg-bun-accent text-white" : "border-bun-line"}`}>{value}</button>)}</div></fieldset>)}
      {(ratings.food && ratings.food <= 2 || ratings.payment && ratings.payment <= 2) && <fieldset className="rounded-2xl border border-bun-line bg-bun-surface p-5"><legend className="px-1 font-semibold">مهم‌ترین دلیل نارضایتی</legend><select className="mt-3 w-full rounded-xl border border-bun-line bg-white p-3" onChange={(e) => setComment((old) => `${old ? `${old} — ` : ""}${e.target.value}`)} defaultValue=""><option value="" disabled>یک مورد را انتخاب کنید</option>{(ratings.food <= 2 ? ["غذا سرد بود", "طعم نامناسب", "تازگی یا کیفیت مواد اولیه"] : ["خطای درگاه", "کندی پرداخت", "مشکل بازگشت به سایت"]).map((x) => <option key={x}>{x}</option>)}</select></fieldset>}
      <fieldset className="rounded-2xl border border-bun-line bg-bun-surface p-5"><legend className="px-1 font-semibold">رضایت کلی (اختیاری)</legend><div className="mt-3 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={overall === value} onClick={() => setOverall(value)} className={`rounded-xl border px-3 py-2 ${overall === value ? "border-bun-accent bg-bun-accent text-white" : "border-bun-line"}`}>{value}</button>)}</div></fieldset>
      <fieldset className="rounded-2xl border border-bun-line bg-bun-surface p-5"><legend className="px-1 font-semibold">چقدر احتمال دارد ما را به دیگران پیشنهاد دهید؟ (۰ تا ۱۰)</legend><div className="mt-3 flex flex-wrap gap-2">{Array.from({ length: 11 }, (_, value) => <button key={value} type="button" aria-pressed={nps === value} onClick={() => setNps(value)} className={`rounded-lg border px-3 py-2 ${nps === value ? "border-bun-accent bg-bun-accent text-white" : "border-bun-line"}`}>{value}</button>)}</div></fieldset>
      <label className="block rounded-2xl border border-bun-line bg-bun-surface p-5 font-semibold">نظر یا پیشنهاد <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={3000} rows={4} className="mt-3 w-full rounded-xl border border-bun-line p-3 font-normal" /></label>
      <button disabled={busy} className="w-full rounded-2xl bg-bun-accent px-5 py-4 font-bold text-white disabled:opacity-60">{busy ? "در حال ثبت…" : "ثبت نظر"}</button>
    </form>
  </main>;
}
