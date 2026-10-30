import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageIntro } from "@/components/PageIntro";
import { useLanguage } from "@/hooks/useLanguage";
import { fetchPublicFaq } from "@/api/support";

export default function FaqPage() {
  const { t } = useTranslation();
  const language = useLanguage();
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchPublicFaq>>>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchPublicFaq().then((result) => { if (active) setItems(result); }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const groups = items.reduce<Record<string, typeof items>>((acc, item) => { (acc[item.category] ??= []).push(item); return acc; }, {});

  return <>
    <PageIntro kicker="FAQ" title={t("faq.title")} description={t("faq.description")} />
    <main className="bg-bun-paper py-12 sm:py-20" dir={language === "fa" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        {loading ? <p className="py-12 text-center text-bun-muted">{t("common.loading")}</p> : failed ? <p role="alert" className="rounded-xl border border-bun-line p-5 text-bun-muted">{t("faq.error")}</p> : !items.length ? <p className="rounded-2xl border border-bun-line p-8 text-center text-bun-muted">{t("faq.empty")}</p> : Object.entries(groups).map(([category, groupedItems]) => <section key={category} className="space-y-3"><h2 className="text-lg font-black text-bun-text">{category}</h2>{groupedItems.map((item) => <details key={item.id} className="group rounded-2xl border border-bun-line bg-bun-surface p-5"><summary className="cursor-pointer font-bold text-bun-text marker:text-bun-accent">{language === "fa" ? item.questionFa : item.questionEn}</summary><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-bun-muted">{language === "fa" ? item.answerFa : item.answerEn}</p></details>)}</section>)}
      </div>
    </main>
  </>;
}
