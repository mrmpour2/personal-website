export type PriceLanguage = "fa" | "en";

export const formatPrice = (
  price: number | string | null | undefined,
  language: PriceLanguage,
): string => {
  if (price === null || price === undefined || price === "") return "—";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "—";
  const formatted = new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(amount);
  return language === "fa" ? `${formatted} تومان` : `${formatted} Toman`;
};
