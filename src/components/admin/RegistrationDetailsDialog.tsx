import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { confirmRegistrationManually, revertManualConfirmation } from "@/lib/manual-payment";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PAYMENT_BADGE_CLASS,
  PAYMENT_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  formatBRL,
} from "@/lib/registration-display";
import type { Registration } from "@/lib/registrations";

/** birth_date is a plain `date`, so split it instead of letting Date shift it a day. */
function formatISODate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const EMPTY = "—";

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  const value = children === null || children === undefined || children === "" ? EMPTY : children;
  return (
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="break-words text-sm">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/** Confirm / undo a payment made outside Mercado Pago. Only rendered for Super Admins. */
function ManualPaymentActions({
  registration,
  onChanged,
}: {
  registration: Registration;
  onChanged: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const isManual = registration.paymentStatus === "manual";
  const alreadyPaid = registration.paymentStatus === "approved";
  if (alreadyPaid) return null;

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setConfirming(false);
      setNote("");
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar a inscrição");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pagamento manual
      </p>
      {isManual ? (
        <>
          <p className="text-sm text-muted-foreground">
            Confirmada manualmente
            {registration.manualConfirmedAt
              ? ` em ${formatDateTime(registration.manualConfirmedAt)}`
              : ""}
            .{registration.manualNote ? ` Observação: ${registration.manualNote}` : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(
                () => revertManualConfirmation({ data: { registrationId: registration.id } }),
                "Inscrição voltou para pendente",
              )
            }
          >
            Voltar para pendente
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Use quando a pessoa pagou direto ao organizador (fora do Mercado Pago). O valor
            registrado será o da inscrição ({formatBRL(registration.price)}).
          </p>
          <Button size="sm" disabled={busy} onClick={() => setConfirming(true)}>
            Confirmar pagamento manualmente
          </Button>
        </>
      )}

      <AlertDialog open={confirming} onOpenChange={(open) => !busy && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento de {registration.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              A inscrição ficará confirmada com {formatBRL(registration.price)} como pago. Descreva
              como o pagamento foi feito (obrigatório).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ex.: Pagou via Pix direto ao organizador em 29/09"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button
              disabled={busy || note.trim().length < 5}
              onClick={() =>
                run(
                  () =>
                    confirmRegistrationManually({
                      data: { registrationId: registration.id, note },
                    }),
                  "Pagamento confirmado manualmente",
                )
              }
            >
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function RegistrationDetailsDialog({
  registration,
  onOpenChange,
  isSuperAdmin = false,
  onChanged,
}: {
  /** The row to show; null keeps the dialog closed. */
  registration: Registration | null;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin?: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  return (
    <Dialog open={registration !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {registration && (
          <>
            <DialogHeader>
              <DialogTitle>{registration.fullName}</DialogTitle>
              <DialogDescription>Todos os dados informados na inscrição.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Section title="Inscrição">
                <Field label="Torneio">{registration.tournamentTitle}</Field>
                <Field label="Divisão">{registration.divisionName}</Field>
                <Field label="Kit">{registration.priceLabel}</Field>
                <Field label="Valor da inscrição">{formatBRL(registration.price)}</Field>
                <Field label="Status">
                  <Badge className={STATUS_BADGE_CLASS[registration.status]}>
                    {STATUS_LABEL[registration.status]}
                  </Badge>
                </Field>
                <Field label="Data da inscrição">{formatDateTime(registration.createdAt)}</Field>
              </Section>

              <Section title="Dados pessoais">
                <Field label="Nome completo">{registration.fullName}</Field>
                <Field label="E-mail">{registration.email}</Field>
                <Field label="Telefone">{registration.phone}</Field>
                <Field label="CPF">{registration.cpf}</Field>
                <Field label="Cidade">{registration.city}</Field>
                <Field label="Data de nascimento">{formatISODate(registration.birthDate)}</Field>
                <Field label="Número PDGA">{registration.pdgaNumber}</Field>
              </Section>

              <Section title="Pagamento">
                <Field label="Status do pagamento">
                  <Badge className={PAYMENT_BADGE_CLASS[registration.paymentStatus]}>
                    {PAYMENT_LABEL[registration.paymentStatus]}
                  </Badge>
                </Field>
                <Field label="Valor pago">
                  {registration.amountPaid === null ? EMPTY : formatBRL(registration.amountPaid)}
                </Field>
                <Field label="Método">{registration.paymentMethod}</Field>
                <Field label="Pago em">
                  {registration.paidAt === null ? EMPTY : formatDateTime(registration.paidAt)}
                </Field>
              </Section>

              {isSuperAdmin && (
                <ManualPaymentActions
                  registration={registration}
                  onChanged={onChanged ?? (() => {})}
                />
              )}

              {registration.notes && (
                <Section title="Observações">
                  <p className="whitespace-pre-wrap break-words text-sm sm:col-span-2">
                    {registration.notes}
                  </p>
                </Section>
              )}

              <Section title="Identificação">
                <div className="sm:col-span-2">
                  <Field label="ID da inscrição">
                    <span className="font-mono text-xs">{registration.id}</span>
                  </Field>
                </div>
              </Section>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
