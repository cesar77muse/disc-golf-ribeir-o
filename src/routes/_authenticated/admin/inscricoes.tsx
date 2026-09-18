import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchRegistrations,
  type PaymentStatus,
  type RegistrationStatus,
} from "@/lib/registrations";

const STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  waitlist: "Lista de espera",
};

const STATUS_BADGE_CLASS: Record<RegistrationStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-acid text-background",
  cancelled: "bg-destructive/10 text-destructive",
  waitlist: "bg-buzz/20 text-buzz",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Aguardando",
  in_process: "Em análise",
  approved: "Pago",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Estornado",
  charged_back: "Contestado",
};

const PAYMENT_BADGE_CLASS: Record<PaymentStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_process: "bg-buzz/20 text-buzz",
  approved: "bg-acid text-background",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-destructive/10 text-destructive",
  charged_back: "bg-destructive/10 text-destructive",
};

type Search = { torneio?: string };

export const Route = createFileRoute("/_authenticated/admin/inscricoes")({
  head: () => ({
    meta: [{ title: "Inscrições — Painel Administrativo" }],
  }),
  validateSearch: (search: Record<string, unknown>): Search => {
    const torneio = search["torneio"];
    return typeof torneio === "string" ? { torneio } : {};
  },
  loader: async () => ({
    registrations: await fetchRegistrations(),
  }),
  component: AdminInscricoes,
});

const ALL = "todos";

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function AdminInscricoes() {
  const { registrations } = Route.useLoaderData();
  const { torneio } = Route.useSearch();

  const [tournamentFilter, setTournamentFilter] = useState(torneio ?? ALL);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | typeof ALL>(ALL);

  const tournamentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of registrations) {
      if (r.tournamentSlug) seen.set(r.tournamentSlug, r.tournamentTitle);
    }
    return [...seen.entries()];
  }, [registrations]);

  const filtered = registrations.filter((r) => {
    if (tournamentFilter !== ALL && r.tournamentSlug !== tournamentFilter) return false;
    if (statusFilter !== ALL && r.status !== statusFilter) return false;
    return true;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Inscrições</h1>
        <p className="text-muted-foreground">
          Inscritos em torneios, para acompanhamento e check-in.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={tournamentFilter} onValueChange={setTournamentFilter}>
          <SelectTrigger className="w-[220px] border-border bg-background">
            <SelectValue placeholder="Torneio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os torneios</SelectItem>
            {tournamentOptions.map(([slug, title]) => (
              <SelectItem key={slug} value={slug}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as RegistrationStatus | typeof ALL)}
        >
          <SelectTrigger className="w-[180px] border-border bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as RegistrationStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {registrations.length === 0
                ? "Nenhuma inscrição registrada ainda."
                : "Nenhuma inscrição corresponde aos filtros selecionados."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Torneio</TableHead>
                  <TableHead>Divisão</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Valor pago</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell>{r.tournamentTitle}</TableCell>
                    <TableCell>{r.divisionName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.email}
                      <br />
                      {r.phone}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE_CLASS[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={PAYMENT_BADGE_CLASS[r.paymentStatus]}>
                        {PAYMENT_LABEL[r.paymentStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {r.amountPaid === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatBRL(r.amountPaid)
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
