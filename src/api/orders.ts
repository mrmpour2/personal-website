import { apiClient } from "./client";

/**
 * لایه سفارش وب‌سایت مهمان.
 *
 * این ماژول همان مسیرهای عمومی را صدا می‌زند که دستیار گفتگو هم استفاده می‌کند
 * (`dashboard/backend/src/routes/paymentRoutes.js`) تا سبد خرید سایت و سبد
 * داخل گفتگو یک رفتار داشته باشند:
 *
 *   GET  /api/payment/config                     → وضعیت dargah
 *   POST /api/payment/orders                     → ساخت سفارش (و کاهش موجودی)
 *
 * نکته مهم: `items[].productId` باید شناسه واقعی محصول در دیتابیس باشد؛
 * سرور وجود و فعال بودن محصول و کافی بودن موجودی را بررسی می‌کند.
 */

export interface PaymentConfig {
  storeName?: string;
  dargah: { enabled: false };
  cod: { enabled: boolean; methods: Array<"cash" | "pos"> };
  deliveryFeeToman: number;
  vatRateBps: number;
  currency: "TOMAN";
}

export type PaymentMethod = "CASH_ON_DELIVERY";

export interface OrderLineInput {
  productId: string;
  /**
   * سایز/واریانت انتخاب‌شده (مثل پیتزای تک‌نفره یا شش‌نفره). سرور قیمت همان
   * واریانت را از دیتابیس می‌خواند، پس قیمت سمت مرورگر مرجع نیست.
   */
  variantId?: string;
  quantity: number;
  /**
   * برای ردیف‌های مخلفات: اشاره به قلم اصلی همین سفارش (شناسه محصول + سایز).
   * سرور بررسی می‌کند که این محصول برای همان غذا در پنل تعریف شده باشد و پیوند
   * را در `chat_order_items.parentItemId` ذخیره می‌کند.
   */
  parent?: { productId: string; variantId?: string };
}

export interface CreateOrderInput {
  sessionId?: string;
  idempotencyKey: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  items: OrderLineInput[];
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryFeeAmount: number;
  taxAmount: number;
  currency: string;
  expiresAt: string;
}

/** پیکربندی پرداخت؛ سرور تعیین می‌کند کدام روش‌ها فعال‌اند. */
export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const { data } = await apiClient.get<PaymentConfig>("/payment/config");
  return data;
}

/** ساخت سفارش و رزرو موجودی. مبلغ نهایی را سرور از قیمت‌های دیتابیس می‌سازد. */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const { data } = await apiClient.post<{ order: CreatedOrder }>("/payment/orders", input, { withCredentials: true, headers: { "Idempotency-Key": input.idempotencyKey } });
  return data.order;
}

/** کد خطای ماشینی بک‌اند (مثل CAPTCHA_REQUIRED) یا رشتهٔ خالی. */
export function errorCodeFrom(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const code = (error as { response?: { data?: { code?: unknown } } }).response?.data?.code;
    if (typeof code === "string") return code;
  }
  return "";
}

/** پیام خطای سرور را استخراج می‌کند و در نبود آن، پیام پیش‌فرض را برمی‌گرداند. */
export function errorMessageFrom(error: unknown, fallback = "ارتباط با سرور برقرار نشد. دوباره تلاش کنید."): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string; errors?: unknown } } }).response;
    const message = response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export async function requestCheckoutOtp(phone: string, captchaToken?: string): Promise<string> {
  const { data } = await apiClient.post<{ challengeId: string }>("/payment/otp/request", { phone, captchaToken }, { withCredentials: true });
  return data.challengeId;
}
export async function verifyCheckoutOtp(phone: string, challengeId: string, code: string, captchaToken?: string) {
  await apiClient.post("/payment/otp/verify", { phone, challengeId, code, captchaToken }, { withCredentials: true });
}
export async function readCheckoutOrder(orderId: string) {
  const { data } = await apiClient.get<{ order: { id: string; status: string; expiresAt: string } }>(`/payment/orders/${encodeURIComponent(orderId)}`, { withCredentials: true });
  return data.order;
}
export async function cancelCheckoutOrder(orderId: string) {
  await apiClient.post(`/payment/orders/${encodeURIComponent(orderId)}/cancel`, {}, { withCredentials: true });
}

export async function confirmCashOnDelivery(orderId: string) {
  const { data } = await apiClient.post<{ order: CreatedOrder & { paymentMethod: PaymentMethod } }>(
    `/payment/orders/${encodeURIComponent(orderId)}/confirm-cod`,
    {},
    { withCredentials: true },
  );
  return data.order;
}
