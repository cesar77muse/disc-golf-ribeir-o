// Shared labels/classes for showing a registration in the admin panel.
import type { PaymentStatus, RegistrationStatus } from "@/lib/registrations";

export const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  waitlist: "Lista de espera",
};

export const STATUS_BADGE_CLASS: Record<RegistrationStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-acid text-background",
  cancelled: "bg-destructive/10 text-destructive",
  waitlist: "bg-buzz/20 text-buzz",
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Aguardando",
  in_process: "Em análise",
  approved: "Pago",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  charged_back: "Contestado",
};

export const PAYMENT_BADGE_CLASS: Record<PaymentStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_process: "bg-buzz/20 text-buzz",
  approved: "bg-acid text-background",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
  charged_back: "bg-destructive/10 text-destructive",
};

export function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
