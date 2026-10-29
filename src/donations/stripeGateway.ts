// Stripe-only tools (the Batches import button, the Stripe Import menu item) show only when a church gateway is Stripe.
export const usesStripeGateway = (gateways?: { provider?: string }[] | null) => (gateways || []).some((g) => (g?.provider || "").toLowerCase() === "stripe");
