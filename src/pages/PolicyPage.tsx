import { Link, useParams } from "react-router-dom";
import { PageIntro } from "@/components/PageIntro";
import { useLanguage } from "@/hooks/useLanguage";

const policies = {
  "shipping-policy": {
    fa: {
      title: "ارسال و تحویل",
      intro: "پیش‌نویس برای بازبینی انسانی پیش از انتشار.",
      sections: [
        "محدودهٔ فعلی ارسال: شهر بیرجند.",
        "هزینهٔ ارسال از تنظیمات checkout خوانده می‌شود و در این نسخه ۱۰۰٬۰۰۰ تومان است؛ تطبیق با تعرفهٔ جاری اسنپ باید پیش از انتشار بررسی شود.",
        "زمان تقریبی تحویل اعلام‌شده ۱۵ دقیقه است و زمان آماده‌سازی محصول حدود ۲۰ دقیقه است؛ زمان واقعی ممکن است تغییر کند.",
        "مبلغ کالا، مالیات ۱۰٪ و هزینهٔ ارسال پیش از ثبت نهایی جداگانه نمایش داده می‌شوند.",
        "محدودهٔ دقیق، دسترسی پیک و هر تغییر هزینه باید پیش از تأیید سفارش به مشتری اعلام شود.",
      ],
    },
    en: {
      title: "Shipping and delivery",
      intro: "Draft — human review is required before publication.",
      sections: [
        "Current delivery area: Birjand city.",
        "Delivery fee is read from checkout configuration and is currently 100,000 toman; verify it against the current Snapp tariff before publication.",
        "The supplied estimated delivery time is 15 minutes; product preparation is approximately 20 minutes. Actual times may vary.",
        "Items, 10% VAT, and delivery are shown separately before final order submission.",
        "Confirm the exact service area, courier availability, and any changed fee before accepting an order.",
      ],
    },
  },
  "return-policy": {
    fa: {
      title: "لغو سفارش و بازگشت وجه",
      intro: "پیش‌نویس؛ بازبینی حقوقی و انسانی پیش از انتشار الزامی است.",
      sections: [
        "درخواست انصراف تا حداقل ۷ روز کاری در این پیش‌نویس پیش‌بینی شده است؛ نحوهٔ اعمال آن برای غذای آماده و مواد غذایی فسادپذیر باید با مشاور حقوقی تطبیق داده شود.",
        "اگر سفارش هنوز آماده‌سازی نشده است، برای درخواست لغو از راه تماس اعلام‌شده استفاده کنید. امکان لغو پس از شروع آماده‌سازی باید موردی بررسی شود.",
        "در صورت تأیید بازپرداخت، مبلغ و زمان انجام آن به روش پرداخت و بررسی سفارش بستگی دارد. جزئیات اجرایی بازپرداخت: نیاز به مقدار واقعی.",
        "موارد نقص، اشتباه در سفارش یا مشکل کیفیت را همراه شماره سفارش و شرح موضوع گزارش کنید؛ اطلاعات تماس و مهلت پاسخ‌گویی نهایی باید تأیید شود.",
        "این متن استثنا یا محدودیت قانونی ایجاد نمی‌کند و تا تأیید مشاور حقوقی نباید به‌عنوان نظر قطعی حقوقی منتشر شود.",
      ],
    },
    en: {
      title: "Cancellation and refunds",
      intro: "Draft — legal and human review is required before publication.",
      sections: [
        "This draft provides for a withdrawal period of at least seven business days. Its application to prepared and perishable food must be reviewed by qualified counsel.",
        "For an order not yet being prepared, contact support to request cancellation. Requests after preparation begins require case-by-case review.",
        "For an approved refund, amount and timing depend on order review and payment method. Operational refund details: needs a verified value.",
        "Report missing, incorrect, or quality-affected items with the order number. Final response time and contact process require confirmation.",
        "This draft does not create a legal exception or limitation and must not be treated as final legal advice.",
      ],
    },
  },
  "privacy-policy": {
    fa: {
      title: "حریم خصوصی",
      intro: "پیش‌نویس؛ جزئیات پردازش و قرارداد ارائه‌دهندگان باید انسانی تأیید شود.",
      sections: [
        "داده‌های سفارش: نام، شمارهٔ موبایل، نشانی تحویل، اقلام و مبلغ سفارش؛ ایمیل اختیاری است. برای امنیت، شناسهٔ IP و رویدادهای فنی نیز ممکن است ثبت شوند.",
        "هدف استفاده: تأیید شماره، ثبت و تحویل سفارش، پشتیبانی، جلوگیری از سوءاستفاده و نگهداری سوابق لازم.",
        "مدت نگهداری داده‌های مشمول این سیاست ۳۰ روز است؛ الزامات نگهداری سوابق مالی/حسابداری و حذف نسخه‌های پشتیبان نیازمند بررسی و تأیید واقعی است.",
        "اشتراک‌گذاری محدود به ارائه‌دهندهٔ پیامک برای OTP، پیک/سرویس ارسال برای تحویل، و میزبانی فنی در حد نیاز است. نام حقوقی، محل پردازش و قرارداد هر ارائه‌دهنده: نیاز به مقدار واقعی.",
        "کوکی ضروری checkout برای اثبات تأیید شماره و ترجیحات رابط استفاده می‌شود. ابزار تحلیل/تبلیغات: نیاز به تصمیم واقعی؛ تا آن زمان فعال فرض نمی‌شود.",
        "کاربر می‌تواند درخواست دسترسی، اصلاح یا حذف داده‌های قابل حذف را ثبت کند. تماس حریم خصوصی: mr.mpour72@gmail.com؛ تلفن: 05632420101؛ نشانی: بیرجند، خیابان پاسداران، تقاطع ۱۵ خرداد؛ کدپستی: 9719816920.",
      ],
    },
    en: {
      title: "Privacy",
      intro: "Draft — processing details and provider contracts require human verification.",
      sections: [
        "Order data includes name, mobile number, delivery address, items, and amount; email is optional. IP identifiers and technical security events may also be recorded.",
        "Data is used to verify a phone number, accept and deliver orders, provide support, prevent abuse, and retain necessary records.",
        "This draft states a 30-day retention period. Financial recordkeeping requirements and backup deletion need verified review.",
        "Limited sharing may be needed with the SMS provider for OTP, courier/delivery service, and technical hosting. Legal entity, processing location, and provider contracts: needs verified values.",
        "Essential checkout proof and interface-preference cookies are used. Analytics/advertising tools: a real decision is required and none are assumed active here.",
        "Users may request access, correction, or deletion where applicable. Privacy contact: mr.mpour72@gmail.com; phone: 05632420101; address: Pasdaran Street, 15 Khordad intersection, Birjand; postal code: 9719816920.",
      ],
    },
  },
} as const;

export default function PolicyPage() {
  const { policyId = "shipping-policy" } = useParams();
  const language = useLanguage();
  const policy = policies[policyId as keyof typeof policies] ?? policies["shipping-policy"];
  const content = policy[language];

  return (
    <>
      <PageIntro kicker={language === "fa" ? "پیش‌نویس سیاست فروشگاه" : "Store policy draft"} title={content.title} description={content.intro} />
      <main className="bg-bun-paper py-12 sm:py-20">
        <article className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8" dir={language === "fa" ? "rtl" : "ltr"}>
          <p className="rounded-2xl border border-bun-orange/40 bg-bun-surface p-4 text-sm font-bold">{content.intro}</p>
          <ul className="list-disc space-y-5 ps-6 leading-8 text-bun-text">
            {content.sections.map((section) => <li key={section}>{section}</li>)}
          </ul>
          <Link className="inline-flex rounded-md underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bun-gold" to="/menu">
            {language === "fa" ? "بازگشت به منو" : "Back to menu"}
          </Link>
        </article>
      </main>
    </>
  );
}
