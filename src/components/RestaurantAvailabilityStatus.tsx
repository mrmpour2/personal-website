import { useTranslation } from "react-i18next";
import { useRestaurantAvailability } from "@/context/RestaurantAvailabilityContext";

function formatDateTime(value: string | null, timeZone: string | null, language: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timeZone || "UTC",
    }).format(new Date(value));
  } catch {
    return `${new Date(value).toISOString()} UTC`;
  }
}

export function RestaurantAvailabilityStatus({ inline = false }: { inline?: boolean }) {
  const { i18n } = useTranslation();
  const { availability, loading, unavailable } = useRestaurantAvailability();
  const language = i18n.resolvedLanguage?.startsWith("fa") ? "fa" : "en";

  let title: string;
  let description: string;
  let style: string;
  if (unavailable || (!availability && !loading)) {
    title = language === "fa" ? "وضعیت سفارش در دسترس نیست" : "Ordering status unavailable";
    description = language === "fa"
      ? "تا زمان بررسی مجدد وضعیت، سفارش آنلاین جدید پذیرفته نمی‌شود."
      : "New online orders are paused until the status can be checked.";
    style = "border-red-200 bg-red-50 text-red-900";
  } else if (loading || !availability) {
    title = language === "fa" ? "در حال بررسی وضعیت پذیرش سفارش…" : "Checking order availability…";
    description = "";
    style = "border-bun-line bg-bun-surface text-bun-muted";
  } else if (availability.status === "SETUP_REQUIRED") {
    title = language === "fa" ? "پذیرش سفارش هنوز راه‌اندازی نشده است" : "Online ordering is not set up yet";
    description = language === "fa"
      ? "ساعات کاری واقعی رستوران هنوز تأیید و فعال نشده است."
      : "The restaurant's actual opening hours have not been reviewed and activated.";
    style = "border-red-200 bg-red-50 text-red-900";
  } else if (availability.acceptsOrders) {
    title = language === "fa" ? "اکنون سفارش می‌پذیریم" : "We are accepting orders now";
    description = "";
    style = "border-emerald-200 bg-emerald-50 text-emerald-900";
  } else {
    title = language === "fa" ? "رستوران اکنون سفارش جدید نمی‌پذیرد" : "The restaurant is closed to new orders";
    const nextOpening = formatDateTime(availability.nextOpeningAt, availability.timeZone, language);
    if (availability.reasonCode === "GLOBAL_STOP") {
      description = language === "fa"
        ? "پذیرش سفارش با توقف سراسری موقتاً متوقف شده است."
        : "Ordering is temporarily paused by the restaurant.";
    } else if (availability.reasonCode === "MANUAL_OVERRIDE") {
      description = language === "fa"
        ? "پذیرش سفارش طبق تنظیم موقت مدیر بسته است."
        : "Ordering is temporarily closed by a manager override.";
    } else {
      description = nextOpening
        ? (language === "fa" ? "بازگشایی بعدی: " : "Next opening: ") + nextOpening
        : (language === "fa" ? "زمان بازگشایی بعدی اعلام نشده است." : "The next opening time has not been announced.");
    }
    style = "border-amber-200 bg-amber-50 text-amber-950";
  }

  const evaluatedAt = availability
    ? formatDateTime(availability.evaluatedAt, availability.timeZone, language)
    : null;
  const content = <aside
    dir={language === "fa" ? "rtl" : "ltr"}
    role={loading ? "status" : availability?.acceptsOrders ? "status" : "alert"}
    aria-live="polite"
    className={"rounded-xl border px-4 py-2.5 shadow-sm " + style}
  >
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <div>
        <strong>{title}</strong>
        {description && <span className="ms-2">{description}</span>}
      </div>
      {evaluatedAt && <span className="text-xs opacity-75">
        {language === "fa" ? "بررسی‌شده: " : "Checked: "}{evaluatedAt}
        {availability?.timeZone ? " · " + availability.timeZone : ""}
        {!availability?.timeZone ? " · UTC" : ""}
      </span>}
    </div>
  </aside>;

  return inline
    ? content
    : <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-40 px-3">
        <div className="pointer-events-auto mx-auto max-w-7xl">{content}</div>
      </div>;
}
