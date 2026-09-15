// Applies a Mercado Pago payment onto a registration row.
//
// Shared by the two things that can learn about a payment: the webhook
// (src/routes/api/mercadopago/webhook.ts) and the return page reconcile
// (getCheckoutStatus in src/lib/checkout.ts). Both can fire for the same
// payment, in either order, several times — so this has to be idempotent.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { MpPayment, MpPaymentStatus } from "@/lib/mercadopago.server";
import type { RegistrationStatus } from "@/lib/registrations";

/**
 * The sign-up's own state, derived from the money. A rejected card attempt
 * leaves the sign-up pending on purpose — the player can go back and pay again
 * — while a refund or chargeback undoes a confirmed spot.
 */
function toRegistrationStatus(payment: MpPaymentStatus): RegistrationStatus {
  switch (payment) {
    case "approved":
      return "confirmed";
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "cancelled";
    default:
      return "pending";
  }
}

type CurrentState = { payment_status: string; mp_payment_id: string | null };

/**
 * A late-arriving webhook for an older, non-approved attempt must not undo an
 * approval that already landed. Refunds and chargebacks always win.
 */
function shouldApply(current: CurrentState, payment: MpPayment): boolean {
  if (current.payment_status !== "approved") return true;
  if (payment.status === "refunded" || payment.status === "charged_back") return true;
  // Same payment reporting itself again: harmless to re-apply.
  return current.mp_payment_id === payment.id;
}

export type ApplyResult = { applied: boolean; registrationId: string };

export async function applyPayment(payment: MpPayment): Promise<ApplyResult | null> {
  const registrationId = payment.externalReference;
  if (!registrationId) return null;

  const { data: current, error: readError } = await supabaseAdmin
    .from("registrations")
    .select("payment_status, mp_payment_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (readError)
    throw new Error(`Failed to read registration ${registrationId}: ${readError.message}`);
  if (!current) return null;

  if (!shouldApply(current as CurrentState, payment)) {
    return { applied: false, registrationId };
  }

  const { error: updateError } = await supabaseAdmin
    .from("registrations")
    .update({
      status: toRegistrationStatus(payment.status),
      payment_status: payment.status,
      mp_payment_id: payment.id,
      mp_status_detail: payment.statusDetail,
      payment_method: payment.paymentMethodId,
      amount_paid: payment.status === "approved" ? payment.transactionAmount : null,
      paid_at:
        payment.status === "approved" ? (payment.dateApproved ?? new Date().toISOString()) : null,
    })
    .eq("id", registrationId);

  if (updateError) {
    throw new Error(`Failed to update registration ${registrationId}: ${updateError.message}`);
  }

  return { applied: true, registrationId };
}
