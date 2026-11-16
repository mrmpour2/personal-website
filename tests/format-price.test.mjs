import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPrice } from "../src/utils/formatPrice.ts";

test("formatPrice handles zero, large values, decimals and empty input", () => {
  assert.equal(formatPrice(0, "fa"), "۰ تومان");
  assert.equal(formatPrice(1234567890, "fa"), "۱٬۲۳۴٬۵۶۷٬۸۹۰ تومان");
  assert.equal(formatPrice(12.5, "en"), "12.5 Toman");
  assert.equal(formatPrice(undefined, "fa"), "—");
  assert.equal(formatPrice("", "en"), "—");
});
