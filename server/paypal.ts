type PayPalSubscription = {
  id?: string;
  status?: string;
  custom_id?: string;
  links?: Array<{ href: string; rel: string }>;
};

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: PayPalSubscription & { billing_agreement_id?: string };
};

function apiBase() {
  return process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar ${name}.`);
  return value;
}

async function getAccessToken() {
  const credentials = Buffer.from(
    `${requiredEnv("PAYPAL_CLIENT_ID")}:${requiredEnv("PAYPAL_CLIENT_SECRET")}`,
  ).toString("base64");
  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("PayPal no pudo autenticar la solicitud.");
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new Error("PayPal no devolvió un token de acceso.");
  return result.access_token;
}

async function paypalRequest<T>(endpoint: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${apiBase()}${endpoint}`, {
    ...options,
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`La solicitud a PayPal falló (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function createPayPalSubscription(
  userId: string,
  email: string,
  clientUrl: string,
) {
  const subscription = await paypalRequest<PayPalSubscription>(
    "/v1/billing/subscriptions",
    {
      method: "POST",
      body: JSON.stringify({
        plan_id: requiredEnv("PAYPAL_PLAN_ID"),
        custom_id: userId,
        subscriber: { email_address: email },
        application_context: {
          brand_name: "Dios conmigo",
          locale: "es-MX",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${clientUrl.replace(/\/+$/, "")}/?billing=success`,
          cancel_url: `${clientUrl.replace(/\/+$/, "")}/?billing=cancel`,
        },
      }),
    },
  );
  const approvalUrl = subscription.links?.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) throw new Error("PayPal no devolvió el enlace de aprobación.");
  return { id: subscription.id, url: approvalUrl };
}

export async function verifyPayPalWebhook(
  headers: Record<string, string | string[] | undefined>,
  event: PayPalWebhookEvent,
) {
  const getHeader = (name: string) => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
  };
  const result = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: getHeader("paypal-auth-algo"),
        cert_url: getHeader("paypal-cert-url"),
        transmission_id: getHeader("paypal-transmission-id"),
        transmission_sig: getHeader("paypal-transmission-sig"),
        transmission_time: getHeader("paypal-transmission-time"),
        webhook_id: requiredEnv("PAYPAL_WEBHOOK_ID"),
        webhook_event: event,
      }),
    },
  );
  return result.verification_status === "SUCCESS";
}

export function subscriptionStatusForPayPalEvent(event: PayPalWebhookEvent) {
  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      return "active";
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      return "canceled";
    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      return "past_due";
    case "BILLING.SUBSCRIPTION.UPDATED": {
      const status = event.resource?.status?.toLowerCase();
      return status === "active" || status === "suspended"
        ? status === "active" ? "active" : "past_due"
        : status === "cancelled" || status === "expired" ? "canceled" : null;
    }
    default:
      return null;
  }
}

export type { PayPalWebhookEvent };
