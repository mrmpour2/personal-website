import test from "node:test";
import assert from "node:assert/strict";
import { cartLineKey, cartLineUnitPrice, isMockFallbackEligible, reconcileLiveCartLines, resolveCatalogItems } from "../src/utils/catalogSource.js";

test("a successful live response is exclusive, including an empty menu", () => {
  const mockItems = [{ id: "mock-item", slug: "mock-slug" }];
  const serverItems = [{ id: "live-item", slug: "live-slug" }];
  assert.deepEqual(resolveCatalogItems("ready", serverItems, mockItems, false, true), serverItems);
  assert.deepEqual(resolveCatalogItems("ready", [], mockItems, false, true), []);
});

test("mock catalog fallback is limited to enabled network/server failures", () => {
  const mockItems = [{ id: "mock-item", slug: "mock-slug" }];
  assert.deepEqual(resolveCatalogItems("error", [], mockItems, true, true), mockItems);
  assert.deepEqual(resolveCatalogItems("error", [], mockItems, true, false), []);
  assert.deepEqual(resolveCatalogItems("error", [], mockItems, false, true), []);
  assert.deepEqual(resolveCatalogItems("loading", [], mockItems, true, true), []);
});

test("only network and server errors qualify for mock fallback", () => {
  assert.equal(isMockFallbackEligible({ isAxiosError: true, code: "ERR_NETWORK" }), true);
  assert.equal(isMockFallbackEligible({ isAxiosError: true, response: { status: 503 } }), true);
  assert.equal(isMockFallbackEligible({ isAxiosError: true, response: { status: 404 } }), false);
  assert.equal(isMockFallbackEligible({ isAxiosError: true, code: "ERR_CANCELED" }), false);
  assert.equal(isMockFallbackEligible(new Error("invalid payload")), false);
});

test("successful server connection removes mock cart rows and orphaned add-ons", () => {
  const lines = [
    { key: "mock", productId: "mock-id" },
    { key: "live", productId: "db-id" },
    { key: "addon:mock", productId: "addon-id", parentKey: "mock" },
    { key: "addon:live", productId: "addon-id", parentKey: "live" },
  ];
  assert.deepEqual(reconcileLiveCartLines(lines, new Set(["db-id", "addon-id"])), [
    { key: "live", productId: "db-id" },
    { key: "addon:live", productId: "addon-id", parentKey: "live" },
  ]);
  assert.notEqual(cartLineKey("db-id", null, ["option-a"]), cartLineKey("db-id", null, ["option-b"]));
  assert.equal(cartLineUnitPrice({ price: 50000, selectedOptions: [{ priceDelta: 8000 }, { priceDelta: 2000 }] }), 60000);
});
