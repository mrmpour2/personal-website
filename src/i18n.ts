import i18n from "i18next";
import type { ParseKeys } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import fa from "@/locales/fa.json";

const LANGUAGE_STORAGE_KEY = "elin-language";

function initialLanguage(): "fa" | "en" {
  if (typeof window === "undefined") return "fa";
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "fa";
  } catch {
    return "fa";
  }
}

const language = initialLanguage();
if (typeof document !== "undefined") {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
}

/** Every valid translation key, derived from `locales/en.json`. */
export type TranslationKey = ParseKeys<"translation">;

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: language,
  fallbackLng: "fa",
  supportedLngs: ["en", "fa"],
  interpolation: { escapeValue: false },
  returnObjects: true,
});

i18n.on("languageChanged", (nextLanguage) => {
  const normalized = nextLanguage.startsWith("en") ? "en" : "fa";
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
    document.documentElement.dir = normalized === "fa" ? "rtl" : "ltr";
  }
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    return;
  }
});

export default i18n;
