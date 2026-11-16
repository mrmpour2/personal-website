import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { MenuItemImage } from "@/components/MenuItemImage";
import { formatPrice } from "@/data/content";
import { useLanguage } from "@/hooks/useLanguage";
import { useModalFocus } from "@/hooks/useModalFocus";
import { useSmoothScrollPause } from "@/hooks/useSmoothScrollPause";
import type { MenuItem, MenuItemVariant } from "@/types";
import { calculateConfiguredUnitPrice } from "@/utils/orderPricing";

const EMPTY_OPTIONS: NonNullable<MenuItem["customOptions"]> = [];

export function ProductOptionsModal({ item, initialVariant, initialOptionIds = [], onClose, onConfirm }: {
  item: MenuItem | null;
  initialVariant?: MenuItemVariant | null;
  initialOptionIds?: string[];
  onClose: () => void;
  onConfirm: (variantKey: string | undefined, optionIds: string[], quantity: number) => void;
}) {
  const language = useLanguage();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const variants = item?.variants ?? [];
  const [variantKey, setVariantKey] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const initialOptionKey = [...initialOptionIds].sort().join("|");
  useEffect(() => {
    if (!item) return;
    setVariantKey(initialVariant?.key ?? item.variants?.find((v) => v.available !== false)?.key ?? "");
    setSelectedOptions(initialOptionKey ? initialOptionKey.split("|") : []);
    setQuantity(1);
  }, [item, initialVariant, initialOptionKey]);
  useSmoothScrollPause(Boolean(item));
  useModalFocus(panel, Boolean(item), onClose);
  const chosen = variants.find((v) => v.key === variantKey);
  const options = item?.customOptions ?? EMPTY_OPTIONS;
  const total = useMemo(() => calculateConfiguredUnitPrice(chosen?.price ?? item?.price ?? 0, options.filter((o) => selectedOptions.includes(o.id)).map((o) => o.priceDelta)) * quantity, [chosen, item, options, selectedOptions, quantity]);
  const fa = language === "fa";
  return <AnimatePresence>
    {item && <div className="fixed inset-0 z-[76]">
      <motion.button aria-label={fa ? "بستن" : "Close"} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center sm:items-center sm:p-5">
        <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} initial={{ opacity: 0, scale: .97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98, y: 16 }} className="pointer-events-auto flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-bun-paper shadow-2xl outline-none sm:max-h-[88dvh] sm:max-w-5xl sm:rounded-3xl">
          <header className="flex shrink-0 items-center justify-between border-b border-bun-line px-5 py-4"><h2 id={titleId} className="font-display text-xl font-black">{item.name[language]}</h2><Button variant="icon" size="icon" onClick={onClose} aria-label={fa ? "بستن" : "Close"}><X /></Button></header>
          <div data-lenis-prevent className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 md:grid-cols-2">
            <section className="space-y-4"><MenuItemImage item={item} reveal={false} className="aspect-[4/3] w-full rounded-2xl" imageClassName="text-sm" />
              <p className="text-sm leading-7 text-bun-muted">{item.description[language]}</p>
              {variants.length > 0 && <fieldset><legend className="mb-2 font-black">{fa ? "انتخاب اندازه" : "Choose a size"}</legend><div className="grid gap-2">{variants.map((v) => <label key={v.key} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${variantKey === v.key ? "border-bun-accent bg-bun-accent/5" : "border-bun-line"} ${v.available === false ? "opacity-45" : ""}`}><span className="flex items-center gap-2"><input type="radio" name="product-size" value={v.key} checked={variantKey === v.key} disabled={v.available === false} onChange={() => setVariantKey(v.key)} />{v.label[language]}</span><span className="font-bold">{formatPrice(v.price, language)}</span></label>)}</div></fieldset>}
            </section>
            <section className="space-y-4">{options.length > 0 && <fieldset><legend className="mb-2 font-black">{fa ? "افزودنی‌های انتخابی" : "Optional extras"}</legend><div className="space-y-2">{options.map((o) => <label key={o.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-bun-line p-3"><span className="flex items-center gap-2"><input type="checkbox" checked={selectedOptions.includes(o.id)} onChange={(e) => setSelectedOptions((current) => e.target.checked ? [...current, o.id] : current.filter((id) => id !== o.id))} />{o.label[language]}</span><span className="text-sm font-bold">+{formatPrice(o.priceDelta, language)}</span></label>)}</div></fieldset>}
              <div className="flex items-center justify-between rounded-xl border border-bun-line p-3"><span className="font-bold">{fa ? "تعداد" : "Quantity"}</span><div className="flex items-center gap-3"><button type="button" aria-label={fa ? "کم کردن" : "Decrease"} onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus size={18}/></button><span aria-live="polite">{quantity}</span><button type="button" aria-label={fa ? "زیاد کردن" : "Increase"} onClick={() => setQuantity((q) => Math.min(50, q + 1))}><Plus size={18}/></button></div></div>
            </section>
          </div>
          <footer className="flex shrink-0 items-center gap-4 border-t border-bun-line bg-bun-paper px-5 py-4"><div className="flex-1"><small className="block text-bun-muted">{fa ? "مبلغ" : "Total"}</small><strong aria-live="polite" className="text-lg">{formatPrice(total, language)}</strong></div><Button className="min-w-48" disabled={variants.length > 0 && !chosen} onClick={() => onConfirm(chosen?.key, selectedOptions, quantity)}>{fa ? "افزودن به سبد" : "Add to cart"}</Button></footer>
        </motion.div>
      </div>
    </div>}
  </AnimatePresence>;
}
