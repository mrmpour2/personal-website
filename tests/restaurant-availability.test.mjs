import assert from "node:assert/strict";
import test from "node:test";
import { canCreateNewOrder, canSubmitCheckoutOrder } from "../src/utils/restaurantAvailability.js";

const open = { status: "OPEN", acceptsOrders: true };
const closed = { status: "CLOSED", acceptsOrders: false };
const setupRequired = { status: "SETUP_REQUIRED", acceptsOrders: false };

test("new checkout is enabled only when the current policy says OPEN", () => {
  assert.equal(canCreateNewOrder(open, false), true);
  assert.equal(canCreateNewOrder(closed, false), false);
  assert.equal(canCreateNewOrder(setupRequired, false), false);
  assert.equal(canCreateNewOrder(open, true), false);
  assert.equal(canCreateNewOrder(null, false), false);
});

test("an already reserved order can still be confirmed after closing", () => {
  const pendingOrder = { id: "accepted-before-close" };
  assert.equal(canSubmitCheckoutOrder({ pendingOrder, availability: closed, unavailable: false }), true);
  assert.equal(canSubmitCheckoutOrder({ pendingOrder: null, availability: closed, unavailable: false }), false);
});
