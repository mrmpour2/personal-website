import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { readCheckoutOrder, type CheckoutOrderDetails } from "@/api/orders";
import { PageIntro } from "@/components/PageIntro";
import { buttonVariants } from "@/components/ui/Button";
import { formatPrice } from "@/data/content";
import { useLanguage } from "@/hooks/useLanguage";

export default function OrderDetailsPage() {
  const { id = "" } = useParams();
  const language = useLanguage();
  const fa = language === "fa";
  const [order, setOrder] = useState<CheckoutOrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    readCheckoutOrder(id)
      .then((result) => { if (active) setOrder(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  return <>
    <PageIntro kicker={fa ? "پیگیری سفارش" : "Order details"} title={fa ? "سفارش شما ثبت شد" : "Your order is confirmed"} description={order ? `${fa ? "شماره سفارش" : "Order number"}: ${order.orderNumber}` : fa ? "وضعیت و جزئیات سفارش شما" : "Your order status and details"} />
    <section className="bg-bun-paper py-12 sm:py-20"><div className="mx-auto max-w-3xl space-y-5 px-4 sm:px-6 lg:px-8">
      {loading ? <div role="status" className="rounded-2xl border border-bun-line bg-bun-surface p-8 text-center">{fa ? "در حال دریافت جزئیات سفارش…" : "Loading order details…"}</div>
        : error || !order ? <div role="alert" className="rounded-2xl border border-bun-line bg-bun-surface p-8 text-center"><p>{fa ? "جزئیات سفارش در دسترس نیست. برای دیدن آن، با همان مرورگر و شمارهٔ تأییدشدهٔ زمان خرید وارد شوید." : "Order details are unavailable. Reopen this page in the browser and verified session used at checkout."}</p><Link to="/checkout" className={buttonVariants({ className: "mt-5" })}>{fa ? "بازگشت به پرداخت" : "Return to checkout"}</Link></div>
        : <>
          <div className="rounded-2xl border border-bun-line bg-bun-surface p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-bun-muted">{fa ? "شماره سفارش" : "Order number"}</p><h2 dir="ltr" className="mt-1 font-mono text-xl font-black">{order.orderNumber}</h2></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">{order.status === "CONFIRMED" ? (fa ? "تأیید شده" : "Confirmed") : order.status}</span></div><p className="mt-3 text-sm text-bun-muted">{fa ? "پرداخت: هنگام تحویل" : "Payment: Cash on delivery"}</p></div>
          <div className="rounded-2xl border border-bun-line bg-bun-surface p-5"><h3 className="font-black">{fa ? "اطلاعات تحویل" : "Delivery information"}</h3><p className="mt-3">{order.customerName} · <span dir="ltr">{order.customerPhone}</span></p><p className="mt-2 text-sm text-bun-muted">{order.shippingAddress}</p></div>
          <div className="rounded-2xl border border-bun-line bg-bun-surface p-5"><h3 className="font-black">{fa ? "اقلام سفارش" : "Items"}</h3><ul className="mt-4 divide-y divide-bun-line">{order.items.map((item) => <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">{item.imageUrl && <img src={item.imageUrl} alt="" className="size-16 rounded-xl object-cover"/>}<div className="min-w-0 flex-1"><p className="font-bold">{item.productName}{item.variantLabel ? ` · ${item.variantLabel}` : ""}</p>{item.selectedOptions?.length ? <p className="mt-1 text-sm text-bun-muted">{item.selectedOptions.map((option) => option.label).join("، ")}</p> : null}<p className="mt-1 text-sm text-bun-muted">{item.quantity.toLocaleString(fa ? "fa-IR" : "en-US")} × {formatPrice(item.unitPrice, language)}</p></div><strong className="shrink-0">{formatPrice(item.unitPrice * item.quantity, language)}</strong></li>)}</ul></div>
          <div className="rounded-2xl border border-bun-line bg-bun-surface p-5">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt>{fa ? "جمع اقلام" : "Subtotal"}</dt><dd>{formatPrice(order.subtotalAmount, language)}</dd></div>
              <div className="flex justify-between"><dt>{fa ? "هزینه ارسال" : "Delivery"}</dt><dd>{formatPrice(order.deliveryFeeAmount, language)}</dd></div>
              {order.taxAmount > 0 && <div className="flex justify-between"><dt>{fa ? "مالیات" : "Tax"}</dt><dd>{formatPrice(order.taxAmount, language)}</dd></div>}
              {order.discountAmount > 0 && <div className="flex justify-between"><dt>{fa ? "تخفیف" : "Discount"}</dt><dd>−{formatPrice(order.discountAmount, language)}</dd></div>}
              <div className="flex justify-between border-t border-bun-line pt-3 text-base font-black"><dt>{fa ? "مبلغ نهایی" : "Total"}</dt><dd>{formatPrice(order.totalAmount, language)}</dd></div>
            </dl>
          </div>
          <Link to="/menu" className={buttonVariants({ size: "lg", className: "w-full" })}>{fa ? "بازگشت به منو" : "Back to menu"}</Link>
        </>}
    </div></section>
  </>;
}
