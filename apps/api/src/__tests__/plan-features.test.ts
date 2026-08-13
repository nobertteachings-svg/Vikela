import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  planHasFeature,
  planAtLeast,
  billingAllowsPaidAccess,
  assertBillingAllowsUsage,
  assertPlanFeature,
} from "../lib/plan-features.js";
import {
  planFromStripePrice,
  intervalFromStripePrice,
  mapStripeSubscriptionStatus,
} from "../lib/stripe.js";

describe("plan-features ladder", () => {
  it("ranks Solo between Free and Starter", () => {
    assert.equal(planAtLeast("SOLO", "FREE"), true);
    assert.equal(planAtLeast("SOLO", "SOLO"), true);
    assert.equal(planAtLeast("SOLO", "STARTER"), false);
    assert.equal(planAtLeast("STARTER", "SOLO"), true);
  });

  it("gates Growth features correctly", () => {
    assert.equal(planHasFeature("FREE", "copilot"), false);
    assert.equal(planHasFeature("SOLO", "copilot"), false);
    assert.equal(planHasFeature("STARTER", "copilot"), false);
    assert.equal(planHasFeature("GROWTH", "copilot"), true);
    assert.equal(planHasFeature("STARTER", "framework_dashboards"), true);
    assert.equal(planHasFeature("SOLO", "framework_dashboards"), false);
    assert.equal(planHasFeature("GROWTH", "questionnaires"), true);
  });

  it("allows paid access for active/trialing/manual/comped", () => {
    assert.equal(
      billingAllowsPaidAccess({ plan: "GROWTH", billingStatus: "ACTIVE", planSource: "STRIPE" }),
      true
    );
    assert.equal(
      billingAllowsPaidAccess({ plan: "GROWTH", billingStatus: "PAST_DUE", planSource: "STRIPE" }),
      false
    );
    assert.equal(
      billingAllowsPaidAccess({ plan: "ENTERPRISE", billingStatus: "ACTIVE", planSource: "MANUAL" }),
      true
    );
    assert.equal(
      billingAllowsPaidAccess({ plan: "STARTER", billingStatus: "COMPED", planSource: "STRIPE" }),
      true
    );
  });

  it("assertBillingAllowsUsage blocks past_due paid orgs", () => {
    assert.throws(
      () =>
        assertBillingAllowsUsage({
          plan: "STARTER",
          billingStatus: "PAST_DUE",
          planSource: "STRIPE",
        }),
      /past due/
    );
    assert.doesNotThrow(() =>
      assertBillingAllowsUsage({ plan: "FREE", billingStatus: "FREE", planSource: "STRIPE" })
    );
  });

  it("assertPlanFeature requires plan + billing health", () => {
    assert.throws(
      () =>
        assertPlanFeature(
          { plan: "STARTER", billingStatus: "ACTIVE", planSource: "STRIPE" },
          "copilot"
        ),
      /GROWTH/
    );
    assert.doesNotThrow(() =>
      assertPlanFeature(
        { plan: "GROWTH", billingStatus: "ACTIVE", planSource: "STRIPE" },
        "copilot"
      )
    );
  });
});

describe("stripe price → plan mapping", () => {
  const prev: Record<string, string | undefined> = {};

  before(() => {
    for (const key of [
      "STRIPE_PRICE_SOLO",
      "STRIPE_PRICE_SOLO_ANNUAL",
      "STRIPE_PRICE_STARTER",
      "STRIPE_PRICE_STARTER_ANNUAL",
      "STRIPE_PRICE_GROWTH",
      "STRIPE_PRICE_GROWTH_ANNUAL",
    ]) {
      prev[key] = process.env[key];
    }
    process.env.STRIPE_PRICE_SOLO = "price_solo_m";
    process.env.STRIPE_PRICE_SOLO_ANNUAL = "price_solo_y";
    process.env.STRIPE_PRICE_STARTER = "price_starter_m";
    process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_y";
    process.env.STRIPE_PRICE_GROWTH = "price_growth_m";
    process.env.STRIPE_PRICE_GROWTH_ANNUAL = "price_growth_y";
  });

  after(() => {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("maps monthly and annual Solo prices", () => {
    assert.equal(planFromStripePrice("price_solo_m"), "SOLO");
    assert.equal(intervalFromStripePrice("price_solo_m"), "monthly");
    assert.equal(planFromStripePrice("price_solo_y"), "SOLO");
    assert.equal(intervalFromStripePrice("price_solo_y"), "annual");
  });

  it("maps Starter and Growth annual prices", () => {
    assert.equal(planFromStripePrice("price_starter_y"), "STARTER");
    assert.equal(intervalFromStripePrice("price_starter_y"), "annual");
    assert.equal(planFromStripePrice("price_growth_m"), "GROWTH");
  });

  it("returns null for unknown price", () => {
    assert.equal(planFromStripePrice("price_unknown"), null);
  });

  it("maps Stripe subscription statuses", () => {
    assert.equal(mapStripeSubscriptionStatus("active"), "ACTIVE");
    assert.equal(mapStripeSubscriptionStatus("trialing"), "TRIALING");
    assert.equal(mapStripeSubscriptionStatus("past_due"), "PAST_DUE");
    assert.equal(mapStripeSubscriptionStatus("unpaid"), "PAST_DUE");
    assert.equal(mapStripeSubscriptionStatus("canceled"), "CANCELED");
  });
});
