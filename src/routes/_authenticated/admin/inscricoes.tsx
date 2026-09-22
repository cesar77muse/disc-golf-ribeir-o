import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { RegistrationDetailsDialog } from "@/components/admin/RegistrationDetailsDialog";
import {
  PAYMENT_BADGE_CLASS,
  PAYMENT_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  formatBRL,
} from "@/lib/registration-display";
import {
  fetchRegistrations,
  type Registration,
  type RegistrationStatus,
} from "@/lib/registrations";

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

function AdminInscricoes() {
  const { registrations } = Route.useLoaderData();
  const { torneio } = Route.useSearch();

  const [tournamentFilter, setTournamentFilter] = useState(torneio ?? ALL);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | typeof ALL>(ALL);
  const [selected, setSelected] = useState<Registration | null>(null);

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
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Valor pago</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell>{r.tournamentTitle}</TableCell>
                    <TableCell>{r.divisionName}</TableCell>
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
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelected(r)}
                        aria-label={`Ver detalhes de ${r.fullName}`}
                      >
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegistrationDetailsDialog
        registration={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </section>
  );
}
