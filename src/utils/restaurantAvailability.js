export function canCreateNewOrder(availability, unavailable) {
  return !unavailable && availability?.acceptsOrders === true;
}

export function canSubmitCheckoutOrder({ pendingOrder, availability, unavailable }) {
  // A reservation accepted before closing may still be confirmed or completed.
  return Boolean(pendingOrder) || canCreateNewOrder(availability, unavailable);
}
