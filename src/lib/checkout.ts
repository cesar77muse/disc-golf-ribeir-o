// Tournament checkout: turns a validated sign-up form into a Mercado Pago
// Checkout Pro preference the browser can be redirected to.
//
// Everything that decides how much money is charged happens here, on the
// server: the form's division/kit choice is looked up against division_prices
// so the amount can never come from the client. The row is inserted with the
// service role (see 20260911000001_registrations_server_side_insert.sql).
//
// This file ships to the client bundle, so server-only modules are imported
// inside the handlers, never at the top level.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { birthDateToISO, isValidCPF } from "@/lib/registration-validation";

const checkoutInputSchema = z.object({
  tournamentSlug: z.string().min(1),
  fullName: z
    .string()
    .trim()
    .min(3)
    .refine((v) => !/\d/.test(v)),
  email: z.string().trim().email(),
  phone: z
    .string()
    .trim()
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 11;
    }),
  cpf: z.string().trim().refine(isValidCPF),
  city: z.string().trim().min(2),
  /** DD/MM/AAAA — converted here so the server, not the browser, owns the parse. */
  birthDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/),
  pdgaNumber: z.string().trim().regex(/^\d*$/).default(""),
  divisionName: z.string().min(1),
  priceLabel: z.string().min(1),
});

export type CheckoutInput = z.input<typeof checkoutInputSchema>;

export type CheckoutSession = {
  registrationId: string;
  /** Mercado Pago's hosted checkout — the browser is sent straight here. */
  initPoint: string;
};

type PriceRow = { label: string; price: number };
type DivisionRow = { name: string; division_prices: PriceRow[] };
type TournamentRow = {
  id: string;
  title: string;
  status: string;
  approval_status: string;
  tournament_divisions: DivisionRow[];
};

const TOURNAMENT_CHECKOUT_FIELDS = `
  id, title, status, approval_status,
  tournament_divisions ( name, division_prices ( label, price ) )
`;

/**
 * Database and network failures are logged in full and reported to the player
 * as one generic sentence: a Postgres or Mercado Pago message means nothing to
 * them and can leak schema details. Business rules ("inscrições encerradas")
 * are thrown directly instead — those are meant to be read.
 */
function internalFailure(context: string, detail: unknown): Error {
  console.error(`[checkout] ${context}`, detail);
  return new Error("Não foi possível iniciar sua inscrição. Tente novamente em alguns instantes.");
}

/** Public site origin: explicit in production, inferred from the request in dev. */
function resolveSiteUrl(requestUrl: string): string {
  const configured = process.env["PUBLIC_SITE_URL"];
  if (configured) return configured.replace(/\/$/, "");
  return new URL(requestUrl).origin;
}

export const startTournamentCheckout = createServerFn({ method: "POST" })
  .validator((data: unknown) => checkoutInputSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutSession> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPreference } = await import("@/lib/mercadopago.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const { data: row, error } = await supabaseAdmin
      .from("tournaments")
      .select(TOURNAMENT_CHECKOUT_FIELDS)
      .eq("slug", data.tournamentSlug)
      .maybeSingle();

    if (error) throw internalFailure("tournament lookup failed", error);
    const tournament = row as unknown as TournamentRow | null;
    if (!tournament) throw new Error("Torneio não encontrado.");
    if (tournament.approval_status !== "approved") {
      throw new Error("Este torneio ainda não está disponível para inscrição.");
    }
    if (tournament.status !== "open") {
      throw new Error("As inscrições para este torneio estão encerradas.");
    }

    const division = tournament.tournament_divisions.find((d) => d.name === data.divisionName);
    const price = division?.division_prices.find((p) => p.label === data.priceLabel);
    if (!division || !price) {
      throw new Error("Divisão ou kit inválido para este torneio.");
    }

    const cpf = data.cpf.replace(/\D/g, "");

    // A player who already paid must not be able to pay twice for the same
    // tournament — pending attempts are fine, they just never went through.
    const { data: paid, error: paidError } = await supabaseAdmin
      .from("registrations")
      .select("id")
      .eq("tournament_id", tournament.id)
      .eq("cpf", cpf)
      .eq("payment_status", "approved")
      .maybeSingle();

    if (paidError) throw internalFailure("duplicate payment check failed", paidError);
    if (paid) throw new Error("Este CPF já tem uma inscrição paga para este torneio.");

    const { data: registration, error: insertError } = await supabaseAdmin
      .from("registrations")
      .insert({
        tournament_id: tournament.id,
        division_name: division.name,
        price_label: price.label,
        price: Number(price.price),
        full_name: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        cpf,
        city: data.city.trim(),
        birth_date: birthDateToISO(data.birthDate),
        pdga_number: data.pdgaNumber.trim(),
      })
      .select("id")
      .single();

    if (insertError || !registration) {
      throw internalFailure("registration insert failed", insertError);
    }

    try {
      const preference = await createPreference({
        registrationId: registration.id,
        title: `${tournament.title} — ${division.name}`,
        description: price.label,
        unitPrice: Number(price.price),
        payer: {
          fullName: data.fullName.trim(),
          email: data.email.trim(),
          phone: data.phone,
          cpf,
        },
        siteUrl: resolveSiteUrl(getRequest().url),
      });

      await supabaseAdmin
        .from("registrations")
        .update({ mp_preference_id: preference.id })
        .eq("id", registration.id);

      return { registrationId: registration.id, initPoint: preference.initPoint };
    } catch (mpError) {
      // No preference means no way to pay, so the row would sit there forever
      // looking like an unpaid sign-up. Drop it and let the player retry.
      await supabaseAdmin.from("registrations").delete().eq("id", registration.id);
      console.error("[mercadopago] preference creation failed", mpError);
      throw new Error("Não foi possível iniciar o pagamento. Tente novamente em alguns instantes.");
    }
  });

export type CheckoutStatus = {
  registrationId: string;
  paymentStatus: string;
  registrationStatus: string;
  tournamentTitle: string;
  tournamentSlug: string;
  divisionName: string;
  priceLabel: string;
  price: number;
  firstName: string;
};

/**
 * Read by the /pagamento return page. Anyone holding the registration UUID can
 * call it, so it deliberately returns no contact details — just enough to tell
 * the player what happened.
 */
export const getCheckoutStatus = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ registrationId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<CheckoutStatus | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { findLatestPaymentByRegistration } = await import("@/lib/mercadopago.server");
    const { applyPayment } = await import("@/lib/payments.server");

    const fields = `
      id, payment_status, status, division_name, price_label, price, full_name,
      tournaments ( slug, title )
    `;

    type StatusRow = {
      id: string;
      payment_status: string;
      status: string;
      division_name: string;
      price_label: string;
      price: number;
      full_name: string;
      tournaments: { slug: string; title: string } | null;
    };

    const read = async (): Promise<StatusRow | null> => {
      const { data: row, error } = await supabaseAdmin
        .from("registrations")
        .select(fields)
        .eq("id", data.registrationId)
        .maybeSingle();
      if (error) throw internalFailure("registration status read failed", error);
      return row as unknown as StatusRow | null;
    };

    let row = await read();
    if (!row) return null;

    // The webhook is the source of truth, but it may not have arrived yet (and
    // in local dev there is no public URL for it at all), so ask Mercado Pago
    // directly while the payment is still open.
    if (row.payment_status !== "approved") {
      try {
        const payment = await findLatestPaymentByRegistration(data.registrationId);
        if (payment) {
          const result = await applyPayment(payment);
          if (result?.applied) row = (await read()) ?? row;
        }
      } catch (mpError) {
        // A failed reconcile must not break the page — the webhook still runs.
        console.error("[mercadopago] reconcile on return failed", mpError);
      }
    }

    return {
      registrationId: row.id,
      paymentStatus: row.payment_status,
      registrationStatus: row.status,
      tournamentTitle: row.tournaments?.title ?? "—",
      tournamentSlug: row.tournaments?.slug ?? "",
      divisionName: row.division_name,
      priceLabel: row.price_label,
      price: Number(row.price),
      firstName: row.full_name.trim().split(/\s+/)[0] ?? "",
    };
  });
