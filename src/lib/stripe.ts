// ══════════════════════════════════════════════════════════════
// NUDGE — Stripe Integration
// All Stripe interactions go through this file.
// ══════════════════════════════════════════════════════════════

const STRIPE_BASE = "https://api.stripe.com/v1";

async function stripeRequest(
  method: "GET" | "POST",
  path:   string,
  body?:  Record<string, string | number | boolean | undefined>
) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");

  const options: RequestInit = {
    method,
    headers: {
      Authorization:  `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  if (body && method === "POST") {
    options.body = new URLSearchParams(
      Object.fromEntries(
        Object.entries(body)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString();
  }

  const res  = await fetch(`${STRIPE_BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe error ${res.status}: ${data.error?.message ?? JSON.stringify(data)}`);
  return data;
}

// ─── Get or create Stripe customer ───────────────────────────
export async function getOrCreateCustomer(userId: string, email: string, name: string | null): Promise<string> {
  const existing = await stripeRequest("GET", `/customers?email=${encodeURIComponent(email)}&limit=1`);
  if (existing.data?.length > 0) return existing.data[0].id;

  const customer = await stripeRequest("POST", "/customers", {
    email,
    name: name ?? undefined,
    "metadata[nudge_user_id]": userId,
  });
  return customer.id;
}

// ─── Create Checkout session ──────────────────────────────────
export async function createCheckoutSession(input: {
  customerId: string;
  userId:     string;
  successUrl: string;
  cancelUrl:  string;
}): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set");

  const session = await stripeRequest("POST", "/checkout/sessions", {
    customer:                 input.customerId,
    mode:                     "subscription",
    "line_items[0][price]":   priceId,
    "line_items[0][quantity]": "1",
    success_url:              input.successUrl,
    cancel_url:               input.cancelUrl,
    client_reference_id:      input.userId,   // ← used by webhook to find user
    "subscription_data[metadata][nudge_user_id]": input.userId,
  });
  return session.url;
}

// ─── Create Customer Portal session ──────────────────────────
export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripeRequest("POST", "/billing_portal/sessions", {
    customer:   customerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ─── Verify + parse webhook event ────────────────────────────
export async function constructWebhookEvent(
  body:      string,
  signature: string
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

  const timestamp = signature.split("t=")[1]?.split(",")[0];
  const v1        = signature.split("v1=")[1]?.split(",")[0];
  if (!timestamp || !v1) throw new Error("Invalid Stripe signature");

  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const encoder      = new TextEncoder();
  const key          = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig          = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  const expectedSig  = Buffer.from(sig).toString("hex");

  if (expectedSig !== v1) throw new Error("Stripe webhook signature mismatch");

  return JSON.parse(body);
}

// ─── Helper: days remaining in trial ─────────────────────────
export function trialDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Helper: is user on active paid plan ─────────────────────
export function isActiveSubscriber(status: string | null): boolean {
  return status === "active";
}

// ─── Helper: should show paywall ─────────────────────────────
export function shouldShowPaywall(
  status:      string | null,
  trialEndsAt: string | null
): boolean {
  if (status === "active") return false;
  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt) < new Date();
  }
  if (status === "past_due" || status === "unpaid" || status === "paused") return true;
  if (status === "canceled") return true;
  return false;
}