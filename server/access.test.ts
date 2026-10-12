import assert from "node:assert/strict";
import test from "node:test";
import { hasAccess } from "./access.js";

const now = new Date("2026-10-12T00:00:00.000Z");

test("allows access through the seven-day trial and blocks it after expiry", () => {
  const trialEndsAt = new Date("2026-10-19T00:00:00.000Z");
  assert.equal(hasAccess(trialEndsAt, null, now), true);
  assert.equal(hasAccess(trialEndsAt, null, new Date("2026-10-19T00:00:00.000Z")), false);
});

test("allows active subscriptions after the trial has expired", () => {
  assert.equal(hasAccess("2026-10-01T00:00:00.000Z", "active", now), true);
  assert.equal(hasAccess("2026-10-01T00:00:00.000Z", "trialing", now), true);
  assert.equal(hasAccess("2026-10-01T00:00:00.000Z", "past_due", now), false);
});
