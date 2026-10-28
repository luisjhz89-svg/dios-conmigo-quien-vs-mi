import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionStatusForPayPalEvent } from "./paypal.js";

test("maps verified PayPal subscription events to account access statuses", () => {
  assert.equal(
    subscriptionStatusForPayPalEvent({ event_type: "BILLING.SUBSCRIPTION.ACTIVATED" }),
    "active",
  );
  assert.equal(
    subscriptionStatusForPayPalEvent({ event_type: "BILLING.SUBSCRIPTION.CANCELLED" }),
    "canceled",
  );
  assert.equal(
    subscriptionStatusForPayPalEvent({ event_type: "BILLING.SUBSCRIPTION.SUSPENDED" }),
    "past_due",
  );
  assert.equal(
    subscriptionStatusForPayPalEvent({
      event_type: "BILLING.SUBSCRIPTION.UPDATED",
      resource: { status: "ACTIVE" },
    }),
    "active",
  );
});

test("ignores unsupported PayPal webhook event types", () => {
  assert.equal(
    subscriptionStatusForPayPalEvent({ event_type: "PAYMENT.CAPTURE.COMPLETED" }),
    null,
  );
});
