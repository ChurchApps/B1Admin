import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usesStripeGateway } from "./stripeGateway.ts";

describe("usesStripeGateway", () => {
  it("is true when any gateway is Stripe, ignoring case", () => {
    assert.equal(usesStripeGateway([{ provider: "Stripe" }]), true);
    assert.equal(usesStripeGateway([{ provider: "stripe" }]), true);
    assert.equal(usesStripeGateway([{ provider: "Paystack" }, { provider: "Stripe" }]), true);
  });

  it("is false for other providers or no gateways", () => {
    assert.equal(usesStripeGateway([{ provider: "Paystack" }]), false);
    assert.equal(usesStripeGateway([{}]), false);
    assert.equal(usesStripeGateway([]), false);
    assert.equal(usesStripeGateway(undefined), false);
    assert.equal(usesStripeGateway(null), false);
  });
});
