// Where Mercado Pago sends the player back after Checkout Pro (back_urls in
// src/lib/mercadopago.server.ts). The status shown here comes from our own
// record, which getCheckoutStatus reconciles against Mercado Pago first — the
// `status` query param Mercado Pago appends is not trusted for anything.
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCheckoutStatus, type CheckoutStatus } from "@/lib/checkout";

const searchSchema = z.object({
  ref: z.string().uuid().optional(),
});

export const Route = createFileRoute("/pagamento")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ ref: search.ref }),
  loader: async ({ deps }) => {
    if (!deps.ref) return null;
    return await getCheckoutStatus({ data: { registrationId: deps.ref } });
  },
  head: () => ({ meta: [{ title: "Pagamento — A Turma do Disc Golf" }] }),
  component: PaymentReturnPage,
});

type Outcome = {
  icon: typeof CheckCircle2;
  iconClass: string;
  title: string;
  message: string;
};

function outcomeFor(status: CheckoutStatus): Outcome {
  switch (status.paymentStatus) {
    case "approved":
      return {
        icon: CheckCircle2,
        iconClass: "text-acid",
        title: "Pagamento confirmado!",
        message: "Sua vaga está garantida. Guarde esta página como comprovante da sua inscrição.",
      };
    case "rejected":
      return {
        icon: XCircle,
        iconClass: "text-destructive",
        title: "Pagamento não aprovado",
        message:
          "O pagamento foi recusado e nada foi cobrado. Você pode voltar ao torneio e tentar de novo.",
      };
    case "cancelled":
      return {
        icon: XCircle,
        iconClass: "text-destructive",
        title: "Pagamento cancelado",
        message: "O pagamento foi cancelado. Sua vaga ainda não está garantida.",
      };
    case "refunded":
    case "charged_back":
      return {
        icon: XCircle,
        iconClass: "text-destructive",
        title: "Pagamento estornado",
        message: "O valor foi devolvido, então a inscrição não está mais ativa.",
      };
    default:
      return {
        icon: Clock,
        iconClass: "text-muted-foreground",
        // PIX and boleto land here: paid by the player, not yet cleared by MP.
        title: "Pagamento em processamento",
        message:
          "Assim que o Mercado Pago confirmar o pagamento, sua inscrição é atualizada automaticamente. Isso pode levar alguns minutos.",
      };
  }
}

function PaymentReturnPage() {
  const status = Route.useLoaderData();

  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <Button
        asChild
        variant="ghost"
        className="-ml-3 mb-4 px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Link to="/torneios">
          <ArrowLeft className="mr-2 h-4 w-4" /> Todos os torneios
        </Link>
      </Button>

      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          {status ? <StatusBody status={status} /> : <UnknownBody />}
        </CardContent>
      </Card>
    </section>
  );
}

function StatusBody({ status }: { status: CheckoutStatus }) {
  const outcome = outcomeFor(status);
  const Icon = outcome.icon;

  return (
    <>
      <Icon className={`mx-auto h-12 w-12 ${outcome.iconClass}`} />
      <h1 className="mt-4 text-2xl font-semibold">{outcome.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{outcome.message}</p>

      <dl className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm">
        <Row label="Torneio" value={status.tournamentTitle} />
        <Row label="Atleta" value={status.firstName} />
        <Row label="Divisão" value={status.divisionName} />
        <Row label="Kit" value={status.priceLabel} />
        <Row label="Valor" value={`R$ ${status.price.toFixed(2).replace(".", ",")}`} />
      </dl>

      {status.tournamentSlug && (
        <Button asChild className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/torneios/$slug" params={{ slug: status.tournamentSlug }}>
            Voltar ao torneio
          </Link>
        </Button>
      )}
    </>
  );
}

function UnknownBody() {
  return (
    <>
      <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-semibold">Inscrição não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não conseguimos localizar esta inscrição. Se você concluiu o pagamento, entre em contato que
        a gente confirma sua vaga.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
