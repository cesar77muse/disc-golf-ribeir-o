// Mercado Pago payment notifications.
//
// This is the source of truth for whether a sign-up was paid: the browser may
// never come back from Checkout Pro (closed tab, PIX paid an hour later), but
// this always fires. Mercado Pago retries on any non-2xx, so transient failures
// return 500 on purpose and only genuinely-handled cases return 200.
//
// Configure the URL in Mercado Pago → Webhooks as
// https://<site>/api/mercadopago/webhook and paste the generated secret into
// MP_WEBHOOK_SECRET.
import { createFileRoute } from "@tanstack/react-router";

/**
 * Mercado Pago signs `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` with the
 * webhook secret and sends it as `x-signature: ts=<ts>,v1=<hmac>`. Without this
 * check anyone who knows the URL could mark any sign-up as paid.
 */
async function isValidSignature(request: Request, dataId: string): Promise<boolean> {
  const secret = process.env["MP_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[mercadopago] MP_WEBHOOK_SECRET is not set — rejecting webhook");
    return false;
  }

  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!signature || !dataId) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((part) => {
      const [key, ...value] = part.split("=");
      return [key?.trim() ?? "", value.join("=").trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return timingSafeEqual(expected, v1);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type WebhookBody = {
  type?: string;
  topic?: string;
  action?: string;
  data?: { id?: string | number };
};

export const Route = createFileRoute("/api/mercadopago/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        let body: WebhookBody = {};
        try {
          body = (await request.json()) as WebhookBody;
        } catch {
          /* Mercado Pago also pings with an empty body — fall through to the id check. */
        }

        // The id arrives in the body for the modern format and in the query
        // string (`data.id`) for the legacy/IPN one.
        const dataId = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
        const kind = body.type ?? body.topic ?? url.searchParams.get("type") ?? "";

        if (!(await isValidSignature(request, dataId))) {
          return new Response("invalid signature", { status: 401 });
        }

        // merchant_order and test pings carry no payment to apply.
        if (kind !== "payment" || !dataId) {
          return new Response(null, { status: 200 });
        }

        try {
          const { getPayment } = await import("@/lib/mercadopago.server");
          const { applyPayment } = await import("@/lib/payments.server");

          const payment = await getPayment(dataId);
          const result = await applyPayment(payment);
          if (!result) {
            // Unknown external_reference: nothing we can do with a retry.
            console.warn(`[mercadopago] payment ${dataId} has no matching registration`);
            return new Response(null, { status: 200 });
          }
          return new Response(null, { status: 200 });
        } catch (error) {
          console.error("[mercadopago] webhook failed", error);
          // Non-2xx makes Mercado Pago retry, which is what we want here.
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
