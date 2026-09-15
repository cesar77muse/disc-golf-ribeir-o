// Mercado Pago (Checkout Pro) REST client.
//
// Deliberately not the `mercadopago` npm SDK: this app builds through nitro
// with cloudflare as the target (see vite.config.ts), so everything here uses
// `fetch` and Web Crypto, both of which exist on Workers and on Node.
//
// SECURITY: MP_ACCESS_TOKEN is a server-only secret. Never move it to a VITE_
// variable — those are inlined into the browser bundle.
const MP_API = "https://api.mercadopago.com";

/** Mercado Pago's own payment states — mirrored by registrations.payment_status. */
export type MpPaymentStatus =
  "pending" | "in_process" | "approved" | "rejected" | "cancelled" | "refunded" | "charged_back";

export type MpPayment = {
  id: string;
  status: MpPaymentStatus;
  statusDetail: string | null;
  externalReference: string | null;
  paymentMethodId: string | null;
  transactionAmount: number | null;
  dateApproved: string | null;
};

export type PreferencePayer = {
  fullName: string;
  email: string;
  /** Digits only, 10-11 chars (DDD + number), as validated by the form. */
  phone: string;
  /** Digits only. */
  cpf: string;
};

export type CreatePreferenceInput = {
  /** registrations.id — comes back on every webhook as external_reference. */
  registrationId: string;
  title: string;
  description: string;
  unitPrice: number;
  payer: PreferencePayer;
  /** Origin of the deployed site, e.g. https://discgolfribeirao.com.br */
  siteUrl: string;
};

export type Preference = {
  id: string;
  /** Where the browser is sent to pay. */
  initPoint: string;
};

function accessToken(): string {
  const token = process.env["MP_ACCESS_TOKEN"];
  if (!token) {
    throw new Error(
      "Missing MP_ACCESS_TOKEN. Add the Mercado Pago access token to .env (see .env.example).",
    );
  }
  return token;
}

/** Test credentials are prefixed TEST- (or belong to an app in test mode). */
export function isTestCredentials(): boolean {
  return (process.env["MP_ACCESS_TOKEN"] ?? "").startsWith("TEST-");
}

/**
 * Mercado Pago rejects `auto_return` and `notification_url` when the URL is not
 * publicly reachable over https, which is exactly the local dev case — so on
 * http origins the preference is created without them and the payment is
 * reconciled on return instead (src/lib/checkout.ts).
 */
function isPublicHttps(siteUrl: string): boolean {
  try {
    const url = new URL(siteUrl);
    return url.protocol === "https:" && url.hostname !== "localhost";
  } catch {
    return false;
  }
}

async function mpFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    // MP puts the useful part in `message`; keep the raw body as a fallback.
    let detail = body;
    try {
      const parsed = JSON.parse(body) as { message?: string };
      if (parsed.message) detail = parsed.message;
    } catch {
      /* not JSON — keep the raw body */
    }
    throw new Error(`Mercado Pago ${response.status} on ${path}: ${detail}`);
  }

  return body ? (JSON.parse(body) as unknown) : null;
}

export async function createPreference(input: CreatePreferenceInput): Promise<Preference> {
  const [firstName, ...rest] = input.payer.fullName.trim().split(/\s+/);
  const digits = input.payer.phone.replace(/\D/g, "");
  const publicSite = isPublicHttps(input.siteUrl);
  const backUrl = `${input.siteUrl.replace(/\/$/, "")}/pagamento`;

  const body = {
    items: [
      {
        id: input.registrationId,
        title: input.title,
        description: input.description,
        quantity: 1,
        currency_id: "BRL",
        unit_price: input.unitPrice,
      },
    ],
    payer: {
      name: firstName,
      surname: rest.join(" "),
      email: input.payer.email,
      phone: { area_code: digits.slice(0, 2), number: digits.slice(2) },
      identification: { type: "CPF", number: input.payer.cpf.replace(/\D/g, "") },
    },
    external_reference: input.registrationId,
    back_urls: {
      success: `${backUrl}?ref=${input.registrationId}`,
      pending: `${backUrl}?ref=${input.registrationId}`,
      failure: `${backUrl}?ref=${input.registrationId}`,
    },
    ...(publicSite
      ? {
          auto_return: "approved",
          notification_url: `${input.siteUrl.replace(/\/$/, "")}/api/mercadopago/webhook`,
        }
      : {}),
    statement_descriptor: "DISCGOLFRP",
    metadata: { registration_id: input.registrationId },
  };

  const data = (await mpFetch("/checkout/preferences", {
    method: "POST",
    // One preference per registration: a double-clicked submit or a retried
    // request must not create a second charge.
    headers: { "X-Idempotency-Key": input.registrationId },
    body: JSON.stringify(body),
  })) as { id: string; init_point: string; sandbox_init_point?: string };

  return { id: data.id, initPoint: data.init_point };
}

type PaymentResponse = {
  id: number | string;
  status: string;
  status_detail: string | null;
  external_reference: string | null;
  payment_method_id: string | null;
  transaction_amount: number | null;
  date_approved: string | null;
};

const PAYMENT_STATUSES: readonly string[] = [
  "pending",
  "in_process",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
  "charged_back",
];

/** The API can add states; anything unknown is treated as still pending. */
function toPaymentStatus(value: string): MpPaymentStatus {
  return PAYMENT_STATUSES.includes(value) ? (value as MpPaymentStatus) : "pending";
}

function toPayment(row: PaymentResponse): MpPayment {
  return {
    id: String(row.id),
    status: toPaymentStatus(row.status),
    statusDetail: row.status_detail,
    externalReference: row.external_reference,
    paymentMethodId: row.payment_method_id,
    transactionAmount: row.transaction_amount,
    dateApproved: row.date_approved,
  };
}

export async function getPayment(paymentId: string): Promise<MpPayment> {
  const data = (await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`)) as PaymentResponse;
  return toPayment(data);
}

/**
 * Used when the browser comes back from Checkout Pro: without a public
 * notification_url (local dev) this is the only way to learn the outcome, and
 * even in production it beats waiting for the webhook to land.
 */
export async function findLatestPaymentByRegistration(
  registrationId: string,
): Promise<MpPayment | null> {
  const data = (await mpFetch(
    `/v1/payments/search?sort=date_created&criteria=desc&external_reference=${encodeURIComponent(registrationId)}`,
  )) as { results?: PaymentResponse[] };

  const results = data.results ?? [];
  // An approved payment wins over an earlier rejected attempt on the same sign-up.
  const payment = results.find((row) => row.status === "approved") ?? results[0];
  return payment ? toPayment(payment) : null;
}
