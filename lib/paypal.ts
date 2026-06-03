/**
 * PayPal Subscriptions API client.
 * Uses the PayPal v1 Billing Plans + Subscriptions REST API.
 * Credentials come from PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET env vars.
 */

const PAYPAL_BASE = "https://api-m.paypal.com";

// ── Access token (server-side, short-lived) ──────────────────────────────────

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

export async function getPayPalToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) return _cachedToken;

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) throw new Error("PayPal credentials not configured");

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal token error: ${err}`);
  }

  const data = await res.json();
  _cachedToken = data.access_token as string;
  _tokenExpiresAt = Date.now() + (data.expires_in as number) * 1000;
  return _cachedToken;
}

async function paypal(path: string, options: RequestInit = {}) {
  const token = await getPayPalToken();
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal ${options.method ?? "GET"} ${path} failed: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Billing Plans ─────────────────────────────────────────────────────────────

export interface CreatePlanOptions {
  name: string;
  description: string;
  currency: "ILS" | "USD";
  amount: string;          // e.g. "9.90"
  interval: "MONTH" | "YEAR";
  trialDays?: number;
}

export async function createBillingPlan(opts: CreatePlanOptions): Promise<string> {
  const cycles = [];

  if (opts.trialDays && opts.trialDays > 0) {
    cycles.push({
      frequency: { interval_unit: "DAY", interval_count: opts.trialDays },
      tenure_type: "TRIAL",
      sequence: 1,
      total_cycles: 1,
      pricing_scheme: { fixed_price: { value: "0", currency_code: opts.currency } },
    });
  }

  cycles.push({
    frequency: { interval_unit: opts.interval, interval_count: 1 },
    tenure_type: "REGULAR",
    sequence: opts.trialDays ? 2 : 1,
    total_cycles: 0, // infinite
    pricing_scheme: { fixed_price: { value: opts.amount, currency_code: opts.currency } },
  });

  const plan = await paypal("/v1/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id: await getOrCreateProduct(),
      name: opts.name,
      description: opts.description,
      status: "ACTIVE",
      billing_cycles: cycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  return plan.id as string;
}

let _productId: string | null = null;

async function getOrCreateProduct(): Promise<string> {
  if (_productId) return _productId;

  const product = await paypal("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      name: "Wingpact Premium",
      description: "Social weight-loss support app — Premium plan",
      type: "SERVICE",
      category: "SOFTWARE",
      home_url: "https://wingpact.app",
    }),
  });

  _productId = product.id as string;
  return _productId;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface CreateSubscriptionResult {
  subscriptionId: string;
  approvalUrl: string;
}

export async function createSubscription(
  planId: string,
  returnUrl: string,
  cancelUrl: string,
  subscriberEmail?: string,
  subscriberName?: string,
): Promise<CreateSubscriptionResult> {
  const body: Record<string, unknown> = {
    plan_id: planId,
    application_context: {
      brand_name: "Wingpact",
      locale: "he-IL",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  if (subscriberEmail) {
    body.subscriber = {
      email_address: subscriberEmail,
      ...(subscriberName ? { name: { given_name: subscriberName.split(" ")[0] ?? "", surname: subscriberName.split(" ").slice(1).join(" ") ?? "" } } : {}),
    };
  }

  const sub = await paypal("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const approvalUrl = (sub.links as Array<{ rel: string; href: string }>).find(
    (l) => l.rel === "approve"
  )?.href;

  if (!approvalUrl) throw new Error("No PayPal approval URL returned");

  return { subscriptionId: sub.id as string, approvalUrl };
}

export async function getSubscription(subscriptionId: string) {
  return paypal(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string, reason = "User requested cancellation"): Promise<void> {
  await paypal(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function suspendSubscription(subscriptionId: string): Promise<void> {
  await paypal(`/v1/billing/subscriptions/${subscriptionId}/suspend`, {
    method: "POST",
    body: JSON.stringify({ reason: "Payment failed" }),
  });
}

// ── Webhook verification ──────────────────────────────────────────────────────

export async function verifyWebhook(opts: {
  webhookId: string;
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookEvent: unknown;
}): Promise<boolean> {
  try {
    const res = await paypal("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        webhook_id: opts.webhookId,
        transmission_id: opts.transmissionId,
        transmission_time: opts.transmissionTime,
        cert_url: opts.certUrl,
        auth_algo: opts.authAlgo,
        transmission_sig: opts.transmissionSig,
        webhook_event: opts.webhookEvent,
      }),
    });
    return (res as { verification_status: string }).verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
