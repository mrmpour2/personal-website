import { apiClient } from "./client";
import type { MenuCategory, MenuItem, MenuItemVariant } from "@/types";

/**
 * لایه اتصال منوی وب‌سایت به بک‌اند Express.
 *
 * وب‌سایت مهمان توکن ندارد، پس از مسیرهای عمومی استفاده می‌کند:
 *   GET /api/public/menu       → فهرست کامل آیتم‌های فعال
 *   GET /api/public/menu/:id   → یک آیتم با slug یا cuid
 *
 * مسیرهای ادمین (`/api/products`) عمداً پشت `requireAuth` باقی می‌مانند.
 */

/** شکل واریانت (سایز/بسته) در پاسخ API عمومی. */
export interface PublicMenuVariant {
  id: string;
  /** برچسب فارسی/اصلی واریانت (متن دیتابیس). */
  label: string;
  /** برچسب انگلیسی اختیاری؛ اگر نباشد همان `label` در هر دو زبان می‌رود. */
  labelEn?: string | null;
  price: number;
  stock: number | null;
  available: boolean;
}

/** شکل آیتم در پاسخ API عمومی (تولیدشده در `publicMenuService.js`). */
export interface PublicMenuItem {
  id: string;
  slug: string;
  productId: string;
  name: string;
  description: string;
  ingredients: string;
  allergenInfo: string;
  purchaseConditions: string;
  /** دسته استاندارد وب‌سایت؛ `null` یعنی بک‌اند نتوانسته دسته خام را نگاشت کند. */
  category: MenuCategory | null;
  /** متن خام دسته در دیتابیس (برای نمایش/دیباگ). */
  categoryLabel: string | null;
  price: number;
  currency: string;
  image: string | null;
  videoUrl?: string | null;
  rating?: number;
  reviewCount?: number;
  editorialScore?: number;
  ingredientItems?: Array<{ name: string; nameEn?: string | null; sortOrder: number }>;
  customOptions?: Array<{ id: string; label: string; labelEn?: string | null; priceDelta: number; sortOrder: number }>;
  stock: number;
  available: boolean;
  /**
   * سایزهای قابل انتخاب (مثل پیتزای تک‌نفره/دو‌نفره/شش‌نفره).
   * آرایه خالی یعنی محصول یک قیمت ثابت دارد و `price` همان قیمت است.
   */
  variants?: PublicMenuVariant[];
  /** تعداد مخلفات پیشنهادی فعال این غذا (نوشیدنی/ساید) در پنل مدیریت. */
  addOnCount?: number;
}

export interface PublicMenuResponse {
  items: PublicMenuItem[];
  total: number;
  currency: string;
}

/**
 * پاسخ مسیر تک‌آیتمی: `GET /api/public/menu/:id` → `{ item: {...} | null }`.
 * (کنترلر آن را داخل `item` می‌گذارد، برخلاف فهرست که `items` دارد.)
 */
export interface PublicMenuItemResponse {
  item: PublicMenuItem | null;
}

/** پاسخ مسیر مخلفات: `GET /api/public/menu/:id/addons` → `{ addOns: [...], total }`. */
export interface PublicMenuAddOnsResponse {
  addOns: PublicMenuItem[];
  total: number;
  currency: string;
}

/** دسته پیش‌فرض برای آیتم‌هایی که دسته‌شان قابل تشخیص نیست (به‌جای پنهان‌کردن آیتم). */
const FALLBACK_CATEGORY: MenuCategory = "burgers";

/**
 * واریانت API را به واریانت وب‌سایت تبدیل می‌کند.
 *
 * متن دیتابیس فارسی است؛ اگر پنل برچسب انگلیسی نداشته باشد همان متن در هر دو
 * زبان قرار می‌گیرد (صادقانه‌تر از خالی گذاشتن فیلد). `key` هم شناسه واریانت در
 * دیتابیس است تا سطرهای سبد دو سایز مختلف را قاطی نکنند.
 */
function toMenuItemVariant(raw: PublicMenuVariant): MenuItemVariant {
  const label = (raw.label ?? "").trim() || raw.id;
  const labelEn = (raw.labelEn ?? "").trim() || label;
  return {
    id: raw.id,
    key: raw.id,
    label: { en: labelEn, fa: label },
    price: raw.price,
    ...(typeof raw.stock === "number" ? { stock: raw.stock } : null),
    available: raw.available,
  };
}

/**
 * پاسخ API را به `MenuItem` وب‌سایت تبدیل می‌کند.
 *
 * متن‌های دیتابیس فقط فارسی‌اند و ترجمه انگلیسی ندارند، پس همان رشته در هر دو
 * زبان قرار می‌گیرد؛ این صادقانه‌تر از خالی گذاشتن فیلد است. امتیازها
 * (`rating`/`score`) هم وجود ندارند و رابط کاربری آن‌ها را پنهان می‌کند.
 */
function toMenuItem(raw: PublicMenuItem): MenuItem {
  const name = raw.name.trim();
  const description = (raw.description ?? "").trim() || name;
  const text = { en: name, fa: name };
  const variants = Array.isArray(raw.variants)
    ? raw.variants.filter((candidate) => candidate && candidate.id).map(toMenuItemVariant)
    : [];
  const addOnCount = typeof raw.addOnCount === "number" && raw.addOnCount > 0 ? raw.addOnCount : 0;
  const ingredientItems = Array.isArray(raw.ingredientItems) ? raw.ingredientItems : [];
  const customOptions = Array.isArray(raw.customOptions) ? raw.customOptions : [];

  return {
    id: raw.slug || raw.id,
    category: raw.category ?? FALLBACK_CATEGORY,
    name: text,
    description: { en: description, fa: description },
    fullDescription: { en: description, fa: description },
    image: (raw.image ?? "").trim(),
    videoUrl: raw.videoUrl?.trim() || null,
    imageAlt: text,
    ...(typeof raw.rating === "number" && typeof raw.reviewCount === "number" && raw.reviewCount > 0
      ? { rating: raw.rating, reviewCount: raw.reviewCount }
      : null),
    ...(typeof raw.editorialScore === "number" ? { score: raw.editorialScore } : null),
    // آیتم دارای سایز، قیمت «از» (ارزان‌ترین واریانت) را نشان می‌دهد.
    price: variants.length ? Math.min(...variants.map((candidate) => candidate.price)) : raw.price,
    ...(variants.length ? { variants } : null),
    ingredients: ingredientItems.length
      ? {
          en: ingredientItems.map((item) => item.nameEn?.trim() || item.name.trim()).filter(Boolean),
          fa: ingredientItems.map((item) => item.name.trim()).filter(Boolean),
        }
      : raw.ingredients?.trim()
      ? { en: [raw.ingredients.trim()], fa: [raw.ingredients.trim()] }
      : { en: [], fa: [] },
    allergenInfo: raw.allergenInfo?.trim() || "نیاز به مقدار واقعی",
    purchaseConditions: raw.purchaseConditions?.trim() || "نیاز به مقدار واقعی",
    options: { en: [], fa: [] },
    ...(customOptions.length ? {
      customOptions: customOptions.map((option) => ({
        id: option.id,
        label: { fa: option.label.trim(), en: option.labelEn?.trim() || option.label.trim() },
        priceDelta: option.priceDelta,
      })),
    } : null),
    productId: raw.productId,
    available: raw.available,
    stock: raw.stock,
    addOnCount,
  };
}

function isPublicMenuResponse(value: unknown): value is PublicMenuResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PublicMenuResponse).items)
  );
}

function isPublicMenuItemResponse(value: unknown): value is PublicMenuItemResponse {
  return typeof value === "object" && value !== null && "item" in value;
}

/** آخرین پاسخ موفق؛ برای نمایش فوری هنگام جابه‌جایی بین صفحه‌ها (بدون فلش لودینگ). */
const MENU_CACHE_TTL_MS = 30_000;
let menuCache: MenuItem[] | null = null;
let menuCacheExpiresAt = 0;
let menuRequest: Promise<MenuItem[]> | null = null;

export function patchPublicMenuProduct(productId: string, changes: Record<string, unknown>): MenuItem[] | null {
  if (!menuCache) return null;
  let matched = false;
  menuCache = menuCache.flatMap((item) => {
    if (item.productId !== productId) return item;
    matched = true;
    if (changes.deleted === true) return [];
    const next = { ...item };
    if (typeof changes.name === "string") next.name = { en: typeof changes.nameEn === "string" ? changes.nameEn : changes.name, fa: changes.name };
    if (typeof changes.description === "string") next.description = { en: typeof changes.descriptionEn === "string" ? changes.descriptionEn : changes.description, fa: changes.description };
    if (typeof changes.price === "number") next.price = changes.price;
    if (typeof changes.stock === "number") next.stock = changes.stock;
    if (typeof changes.imageUrl === "string" || changes.imageUrl === null) next.image = changes.imageUrl ?? "";
    if (typeof changes.isActive === "boolean") next.available = changes.isActive && (next.stock ?? 0) > 0;
    if (typeof changes.stock === "number") next.available = changes.stock > 0 && changes.isActive !== false;
    return next;
  });
  if (matched) window.dispatchEvent(new CustomEvent("catalog:updated", { detail: { productId, changes } }));
  return menuCache;
}

/** فهرست کش‌شده اگر تا این لحظه رسیده باشد، وگرنه `null`. */
export function peekPublicMenu(): MenuItem[] | null {
  if (menuCache && Date.now() >= menuCacheExpiresAt) {
    menuCache = null;
    menuCacheExpiresAt = 0;
  }
  return menuCache;
}

async function requestPublicMenu(): Promise<MenuItem[]> {
  const response = await apiClient.get<PublicMenuResponse>("/public/menu");
  if (!isPublicMenuResponse(response.data)) {
    throw new Error("پاسخ نامعتبر از API منو");
  }
  return response.data.items.map(toMenuItem);
}

/**
 * فهرست منو از `/api/public/menu`.
 *
 * نتیجه در حافظه کش می‌شود تا صفحه منو و صفحه محصول (برای آیتم‌های مرتبط)
 * یک درخواست بیشتر نزنند. درخواست ناموفق کش نمی‌شود تا بار بعد دوباره تلاش شود.
 */
export function fetchPublicMenu(): Promise<MenuItem[]> {
  const cached = peekPublicMenu();
  if (cached) return Promise.resolve(cached);

  menuRequest ??= requestPublicMenu()
    .then((items) => {
      menuCache = items;
      menuCacheExpiresAt = Date.now() + MENU_CACHE_TTL_MS;
      menuRequest = null;
      return items;
    })
    .catch((error: unknown) => {
      menuRequest = null;
      throw error;
    });

  return menuRequest;
}

/** Force a fresh menu read after an SSE cursor falls outside retained history. */
export async function refreshPublicMenu(): Promise<MenuItem[]> {
  menuCache = null;
  menuCacheExpiresAt = 0;
  menuRequest = null;
  return fetchPublicMenu();
}

/**
 * یک آیتم منو با slug یا cuid.
 *
 * اول از فهرست کش‌شده خوانده می‌شود (بدون درخواست اضافه) و اگر آنجا نبود،
 * مسیر مستقیم `/public/menu/:id` زده می‌شود تا آیتم‌هایی که بعد از پر شدن کش
 * اضافه شده‌اند هم پیدا شوند. `null` یعنی آیتم عمومی وجود ندارد.
 */
export async function fetchPublicMenuItem(id: string): Promise<MenuItem | null> {
  const cached = peekPublicMenu()?.find((item) => item.id === id || item.productId === id);
  if (cached) return cached;

  try {
    const items = await fetchPublicMenu();
    const found = items.find((item) => item.id === id || item.productId === id);
    if (found) return found;

    const response = await apiClient.get<PublicMenuItemResponse>(
      `/public/menu/${encodeURIComponent(id)}`,
    );
    const item = isPublicMenuItemResponse(response.data) ? response.data.item : null;
    return item ? toMenuItem(item) : null;
  } catch {
    return null;
  }
}

/**
 * مخلفات پیشنهادی یک غذا (نوشیدنی/ساید) برای پنل «تکمیل سفارش».
 *
 * فهرست کامل فقط هنگام باز شدن پنل خوانده می‌شود، پس فهرست منو سبک می‌ماند.
 * کش نمی‌شود چون مدیر ممکن است پیکربندی را بین دو سفارش تغییر دهد و هزینه‌اش
 * یک درخواست کوچک است. خطا به مصرف‌کننده پرتاب می‌شود تا پنل حالت خطا/تلاش
 * دوباره نشان دهد (به‌جای پنهان‌کردن مشکل).
 */
export async function fetchMenuItemAddOns(id: string): Promise<MenuItem[]> {
  const response = await apiClient.get<PublicMenuAddOnsResponse>(
    `/public/menu/${encodeURIComponent(id)}/addons`,
  );
  const addOns = response.data?.addOns;
  if (!Array.isArray(addOns)) throw new Error("پاسخ نامعتبر از API مخلفات");
  return addOns.map(toMenuItem);
}
