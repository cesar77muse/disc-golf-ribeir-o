// Manual payment confirmation: a Super Admin marks a sign-up as paid when the
// player paid the organiser outside Mercado Pago (typically after the checkout
// rejected them and they sent a PIX directly).
//
// Runs on the server so the role check cannot be skipped from the browser, and
// so the amount comes from the registration's own price rather than the client.
// This file ships to the client bundle, so server-only modules are imported
// inside the handlers, never at the top level.
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Reads the caller's own profile (RLS allows it) and insists on an approved Super Admin. */
async function assertSuperAdmin(supabase: SupabaseClient<Database>, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data || data.role !== "super_admin" || data.status !== "approved") {
    throw new Error("Apenas Super Admins podem alterar o pagamento de uma inscrição.");
  }
}

function internalFailure(context: string, detail: unknown): Error {
  console.error(`[manual-payment] ${context}`, detail);
  return new Error("Não foi possível atualizar a inscrição. Tente novamente.");
}

const confirmInputSchema = z.object({
  registrationId: z.string().uuid(),
  note: z.string().trim().min(5, "Informe uma observação (mín. 5 caracteres).").max(500),
});

export const confirmRegistrationManually = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => confirmInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readError } = await supabaseAdmin
      .from("registrations")
      .select("id, price, payment_status")
      .eq("id", data.registrationId)
      .maybeSingle();
    if (readError) throw internalFailure("read failed", readError);
    if (!row) throw new Error("Inscrição não encontrada.");
    if (row.payment_status === "approved" || row.payment_status === "manual") {
      throw new Error("Esta inscrição já está com o pagamento confirmado.");
    }

    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("registrations")
      .update({
        status: "confirmed",
        payment_status: "manual",
        payment_method: "manual",
        amount_paid: Number(row.price),
        paid_at: now,
        manual_confirmed_by: context.userId,
        manual_confirmed_at: now,
        manual_note: data.note,
      })
      .eq("id", data.registrationId);
    if (error) throw internalFailure("confirm failed", error);

    return { ok: true as const };
  });

const revertInputSchema = z.object({ registrationId: z.string().uuid() });

/** Undoes a manual confirmation (e.g. confirmed by mistake); only touches `manual` rows. */
export const revertManualConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => revertInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: updated, error } = await supabaseAdmin
      .from("registrations")
      .update({
        status: "pending",
        payment_status: "pending",
        payment_method: null,
        amount_paid: null,
        paid_at: null,
        manual_confirmed_by: null,
        manual_confirmed_at: null,
        manual_note: null,
      })
      .eq("id", data.registrationId)
      .eq("payment_status", "manual")
      .select("id");
    if (error) throw internalFailure("revert failed", error);
    if (!updated?.length)
      throw new Error("Esta inscrição não tem confirmação manual para desfazer.");

    return { ok: true as const };
  });
