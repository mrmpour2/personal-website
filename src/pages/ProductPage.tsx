import { ChevronLeft, Play, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AddToCartButton } from "@/components/AddToCartButton";
import { MenuCard } from "@/components/MenuCard";
import { MenuItemImage } from "@/components/MenuItemImage";
import { MotionSection } from "@/components/MotionSection";
import { MotionText } from "@/components/MotionText";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ScoreMeter } from "@/components/ScoreMeter";
import { SkeletonCard } from "@/components/SkeletonCard";
import { MockFallbackMarker } from "@/components/MockFallbackMarker";
import { buttonVariants } from "@/components/ui/Button";
import { isOrderableItem } from "@/context/CartContext";
import {
  defaultVariant,
  findVariant,
  formatPrice,
  hasVariants,
  itemVariants,
  menuItems,
  relatedMenuItems,
} from "@/data/content";
import { useLanguage } from "@/hooks/useLanguage";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import { cn } from "@/utils/cn";
import { productVideoKind } from "@/utils/productVideo";
import { resolveCatalogItems } from "@/utils/catalogSource.js";

export default function ProductPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const language = useLanguage();
  const { items: liveItems, status, fallbackEligible, usingMockFallback } = usePublicMenu();
  const catalogItems = useMemo(
    () => resolveCatalogItems(status, liveItems, menuItems, fallbackEligible),
    [status, liveItems, fallbackEligible],
  );

  /**
   * آیتم‌های کاتالوگ ثابت اول بررسی می‌شوند (بدون انتظار برای شبکه)، وگرنه آیتم
   * زنده پنل با همان slug یا cuid پیدا می‌شود. بنابراین آدرس‌های قدیمی
   * (`/menu/smoky-smash`) و آیتم‌های دیتابیس هر دو کار می‌کنند.
   */
  const item = useMemo(
    () => catalogItems.find((candidate) => candidate.id === id || candidate.productId === id),
    [id, catalogItems],
  );

  const related = useMemo(
    () => (item ? relatedMenuItems(item, 3, catalogItems) : []),
    [item, catalogItems]
  );

  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => setVideoFailed(false), [item?.videoUrl]);

  /**
   * سایز انتخاب‌شده کاربر. `null` یعنی هنوز دستی انتخاب نشده و واریانت پیش‌فرض
   * (اولین سایز موجود) نمایش داده می‌شود. با رفتن به صفحه محصول دیگر، کلید
   * ذخیره‌شده در آیتم جدید وجود ندارد و خودبه‌خود سایز پیش‌فرض اعمال می‌شود.
   */
  const [variantKey, setVariantKey] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  useEffect(() => setSelectedOptionIds([]), [item?.id]);

  const variants = item ? itemVariants(item) : [];
  const selectedVariant = item ? (findVariant(item, variantKey) ?? defaultVariant(item)) : null;
  const customOptions = item?.customOptions ?? [];
  const selectedOptionPrice = customOptions
    .filter((option) => selectedOptionIds.includes(option.id))
    .reduce((sum, option) => sum + option.priceDelta, 0);
  /** قیمتی که کاربر باید بپردازد: قیمت سایز انتخاب‌شده (یا قیمت پایه). */
  const displayPrice = (selectedVariant?.price ?? item?.price ?? 0) + selectedOptionPrice;

  if (!item) {
    if (status === "loading") {
      return (
        <section className="bg-bun-paper px-4 pb-20 pt-32 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SkeletonCard className="max-w-3xl" />
          </div>
        </section>
      );
    }

    return (
      <section className="grid min-h-[70vh] place-items-center bg-bun-paper px-4 pt-24 text-center">
        <MockFallbackMarker active={usingMockFallback} />
        <div>
          <h1 className="font-display text-4xl font-black">{t("product.notFound")}</h1>
          <Link to="/menu" className={buttonVariants({ className: "mt-6" })}>{t("common.back")}</Link>
        </div>
      </section>
    );
  }

  const ingredients = item.ingredients[language];
  const options = item.options[language];
  const unavailable = item.available === false;
  const productVideo = productVideoKind(item.videoUrl);

  /**
   * بخش نظرات با شناسهٔ دیتابیس محصول کار می‌کند. آیتم‌های ثابت کاتالوگ شناسهٔ
   * دیتابیس ندارند، پس برایشان فقط دادهٔ آزمایشی نمایش داده می‌شود (`demoOnly`)
   * و نظر ثبت‌شده هم فقط در همین تب می‌ماند.
   */
  const reviewProductId = item.productId ?? item.id;
  const reviewsDemoOnly = !item.productId;

  return (
    <>
      <section className="bg-bun-paper pb-16 pt-28 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link to="/menu" className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-6 px-0" })}>
            <ChevronLeft className={cn("size-4", language === "fa" && "rotate-180")} aria-hidden="true" />
            {t("common.back")}
          </Link>
          <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_.92fr] lg:gap-16">
            <div className="space-y-4">
              <MenuItemImage
                item={item}
                eager
                sizes="(max-width: 1024px) 100vw, 56vw"
                className="aspect-[4/3] rounded-[2rem] bg-bun-surface shadow-2xl shadow-black/10"
              />
            </div>
            <div className="lg:pt-4" data-reveal-group="">
              <div className="flex items-center gap-2 text-sm font-bold text-bun-muted" data-reveal-item="">
                {item.rating === undefined ? null : (
                  <>
                    <Star className="size-4 fill-bun-gold text-bun-gold" aria-hidden="true" />
                    <span>{item.rating}</span>
                    {item.reviewCount ? <span>({item.reviewCount.toLocaleString(language === "fa" ? "fa-IR" : "en-US")})</span> : null}
                    <span>·</span>
                  </>
                )}
                <span>{t(`menuPage.categories.${item.category}`)}</span>
              </div>
              <MotionText
                as="h1"
                text={item.name[language]}
                className="mt-4 font-display text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[0.92] tracking-[-0.06em] text-bun-text"
              />
              <p className="mt-5 text-base leading-8 text-bun-muted sm:text-lg" data-reveal-item="">
                {item.fullDescription[language]}
              </p>
              <p className="mt-7 font-display text-2xl font-black text-bun-accent" data-reveal-item="">
                {formatPrice(displayPrice, language)}
              </p>
              {unavailable ? (
                <p className="mt-3 text-sm font-black text-bun-red" role="status">
                  {t("menuPage.unavailable")}
                </p>
              ) : null}
              {hasVariants(item) ? (
                <fieldset className="mt-8" data-reveal-item="">
                  <legend className="text-sm font-black uppercase tracking-[0.12em] text-bun-text">
                    {t("product.size")}
                  </legend>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {variants.map((candidate) => {
                      const isActive = selectedVariant?.key === candidate.key;
                      const soldOut = candidate.available === false;
                      return (
                        <label
                          key={candidate.key}
                          className={cn("cursor-pointer", soldOut && "cursor-not-allowed opacity-50")}
                        >
                          <input
                            className="peer sr-only"
                            type="radio"
                            name="size"
                            value={candidate.key}
                            checked={isActive}
                            disabled={soldOut}
                            onChange={() => setVariantKey(candidate.key)}
                          />
                          <span
                            className={cn(
                              "flex min-h-12 flex-col items-start justify-center rounded-2xl border px-4 py-2 text-sm font-bold transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-bun-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bun-paper",
                              isActive
                                ? "border-bun-orange bg-bun-orange/10 text-bun-accent"
                                : "border-bun-line bg-bun-surface text-bun-muted hover:border-bun-orange/60",
                            )}
                          >
                            <span>{candidate.label[language]}</span>
                            <span className="mt-0.5 text-xs font-black text-bun-text">
                              {formatPrice(candidate.price, language)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
              <div className="mt-8" data-reveal-item="">
                {customOptions.length ? (
                  <fieldset>
                    <legend className="text-sm font-black uppercase tracking-[0.12em] text-bun-text">
                      {t("product.customize")}
                    </legend>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {customOptions.map((option) => {
                        const checked = selectedOptionIds.includes(option.id);
                        return (
                          <label key={option.id} className="cursor-pointer">
                            <input
                              className="peer sr-only"
                              type="checkbox"
                              name="options"
                              value={option.id}
                              checked={checked}
                              onChange={() => setSelectedOptionIds((current) => checked
                                ? current.filter((id) => id !== option.id)
                                : [...current, option.id])}
                            />
                            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bun-line bg-bun-surface px-4 text-sm font-bold text-bun-muted transition-colors peer-checked:border-bun-orange peer-checked:bg-bun-orange/10 peer-checked:text-bun-accent peer-focus-visible:ring-2 peer-focus-visible:ring-bun-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bun-paper hover:border-bun-orange/60">
                              {option.label[language]}
                              {option.priceDelta > 0 ? <span className="text-xs">+{formatPrice(option.priceDelta, language)}</span> : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : options.length ? (
                  <fieldset>
                    <legend className="text-sm font-black uppercase tracking-[0.12em] text-bun-text">
                      {t("product.customize")}
                    </legend>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {options.map((option, index) => (
                        <label key={option} className="cursor-pointer">
                          <input className="peer sr-only" type="checkbox" name="options" value={option} defaultChecked={index === 0} />
                          <span className="inline-flex min-h-11 items-center rounded-full border border-bun-line bg-bun-surface px-4 text-sm font-bold text-bun-muted transition-colors peer-checked:border-bun-orange peer-checked:bg-bun-orange/10 peer-checked:text-bun-accent peer-focus-visible:ring-2 peer-focus-visible:ring-bun-gold peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bun-paper hover:border-bun-orange/60">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <AddToCartButton
                    item={item}
                    configureOptions={false}
                    selectedVariant={selectedVariant}
                    selectedOptionIds={selectedOptionIds}
                    size="lg"
                    magnetic={0.14}
                    label={t("product.addToCart")}
                    showUnavailableHint={false}
                  />
                  <Link
                    to="/checkout"
                    data-magnetic="0.12"
                    className={buttonVariants({ variant: "secondary", size: "lg" })}
                  >
                    {t("cart.viewCart")}
                  </Link>
                </div>
                {isOrderableItem(item) ? null : (
                  <p className="mt-4 text-sm font-bold text-bun-muted">{t("product.notOrderable")}</p>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>
      {ingredients.length || item.score !== undefined ? (
        <MotionSection className="bg-bun-surface py-16 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            {ingredients.length ? (
              <div data-reveal-group="">
                <p className="section-kicker" data-reveal-item="">{t("product.ingredients")}</p>
                <div className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {ingredients.map((ingredient) => (
                    <div
                      key={ingredient}
                      data-reveal-item=""
                      className="flex items-center gap-3 border-b border-bun-line pb-4 text-base font-bold text-bun-text"
                    >
                      <span className="size-2 rounded-full bg-bun-orange" /> {ingredient}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {item.score === undefined ? null : <ScoreMeter score={item.score} />}
          </div>
        </MotionSection>
      ) : null}
      {item.productId && (item.allergenInfo || item.purchaseConditions) ? (
        <section className="bg-bun-paper py-10">
          <div className="mx-auto max-w-7xl space-y-3 px-4 text-sm leading-7 text-bun-muted sm:px-6 lg:px-8">
            {item.allergenInfo ? <p><strong>{t("product.allergens")}:</strong> {item.allergenInfo}</p> : null}
            {item.purchaseConditions ? <p><strong>{t("product.purchaseConditions")}:</strong> {item.purchaseConditions}</p> : null}
          </div>
        </section>
      ) : null}

      {!videoFailed ? (
        <MotionSection className="bg-bun-ink py-16 text-white sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Play className="size-5 fill-bun-orange text-bun-orange" aria-hidden="true" />
              <p className="section-kicker !text-bun-orange">{t("product.intro")}</p>
            </div>
            <p className="mt-3 text-white/65">{t("product.videoNote")}</p>
            {productVideo?.kind === "file" ? (
              <video
                key={productVideo.src}
                controls
                preload="none"
                playsInline
                poster={item.image || undefined}
                onError={() => setVideoFailed(true)}
                className="mt-8 aspect-video w-full rounded-[1.75rem] bg-black object-cover shadow-2xl"
              >
                <source src={productVideo.src} type={productVideo.mimeType} />
              </video>
            ) : productVideo?.kind === "embed" ? (
              <iframe
                key={productVideo.src}
                src={productVideo.src}
                title={language === "fa" ? `ویدیوی ${item.name.fa}` : `${item.name.en} video`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setVideoFailed(true)}
                className="mt-8 aspect-video w-full rounded-[1.75rem] border-0 bg-black shadow-2xl"
              />
            ) : (
              <video
                controls
                preload="none"
                playsInline
                poster="https://images.pexels.com/videos/5254603/burgers-5254603.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1280&fm=webp"
                onError={() => setVideoFailed(true)}
                className="mt-8 aspect-video w-full rounded-[1.75rem] bg-black object-cover shadow-2xl"
              >
                <source src="https://videos.pexels.com/video-files/5254603/5254603-hd_1920_1080_25fps.mp4" type="video/mp4" />
              </video>
            )}
          </div>
        </MotionSection>
      ) : null}

      <ReviewsSection productId={reviewProductId} demoOnly={reviewsDemoOnly} />

      <MotionSection className="bg-bun-paper pb-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="section-title">{t("product.related")}</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => <MenuCard key={candidate.id} item={candidate} />)}
          </div>
        </div>
      </MotionSection>

    </>
  );
}
