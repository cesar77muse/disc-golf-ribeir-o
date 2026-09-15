import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { parseLocalDate } from "@/lib/site-data";
import { fetchTournamentsForAdmin } from "@/lib/tournaments";
import { fetchRegistrations } from "@/lib/registrations";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  head: () => ({
    meta: [{ title: "Financeiro — Painel Administrativo" }],
  }),
  loader: async ({ context }) => ({
    tournaments: await fetchTournamentsForAdmin(context.profile),
    registrations: await fetchRegistrations(),
  }),
  component: AdminFinanceiro,
});

const ALL_PERIOD = "all";

/** period is "all", "y:<year>" or "s:<year>:<1|2>" (semester, months 0-5 / 6-11). */
function matchesPeriod(date: string, period: string): boolean {
  if (period === ALL_PERIOD) return true;
  const d = parseLocalDate(date);
  const [kind, yearStr, semStr] = period.split(":");
  if (Number(yearStr) !== d.getFullYear()) return false;
  if (kind === "y") return true;
  const isFirstHalf = d.getMonth() < 6;
  return semStr === "1" ? isFirstHalf : !isFirstHalf;
}

function AdminFinanceiro() {
  const { tournaments, registrations } = Route.useLoaderData();
  const [period, setPeriod] = useState(ALL_PERIOD);

  const years = useMemo(() => {
    const set = new Set(tournaments.map((t) => parseLocalDate(t.date).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [tournaments]);

  const periodTournaments = tournaments.filter((t) => matchesPeriod(t.date, period));

  const rows = periodTournaments.map((t) => {
    const tournamentRegistrations = registrations.filter((r) => r.tournamentSlug === t.slug);
    // Received money only: what Mercado Pago actually captured. amountPaid can
    // differ from the listed price (a partial refund), so it wins when set.
    const received = tournamentRegistrations
      .filter((r) => r.paymentStatus === "approved")
      .reduce((acc, r) => acc + (r.amountPaid ?? r.price), 0);
    // Still payable: a checkout that was started but never approved. Rejected
    // attempts stay here because the player can still come back and pay.
    const pending = tournamentRegistrations
      .filter(
        (r) =>
          r.status !== "cancelled" &&
          (r.paymentStatus === "pending" ||
            r.paymentStatus === "in_process" ||
            r.paymentStatus === "rejected"),
      )
      .reduce((acc, r) => acc + r.price, 0);
    return { slug: t.slug, title: t.title, confirmed: received, pending };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      confirmed: acc.confirmed + r.confirmed,
      pending: acc.pending + r.pending,
    }),
    { confirmed: 0, pending: 0 },
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">
          Receita por torneio, com base nos pagamentos confirmados pelo Mercado Pago.
        </p>
      </div>

      <div className="mb-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[220px] border-border bg-background">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PERIOD}>Todo o histórico</SelectItem>
            {years.map((year) => (
              <SelectGroup key={year}>
                <SelectLabel>{year}</SelectLabel>
                <SelectItem value={`y:${year}`}>Ano completo</SelectItem>
                <SelectItem value={`s:${year}:1`}>1º semestre</SelectItem>
                <SelectItem value={`s:${year}:2`}>2º semestre</SelectItem>
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Recebida</p>
            <p className="text-2xl font-bold text-acid">R$ {totals.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Aguardando pagamento</p>
            <p className="text-2xl font-bold">R$ {totals.pending}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {tournaments.length === 0
                ? "Nenhum torneio cadastrado."
                : "Nenhum torneio no período selecionado."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Torneio</TableHead>
                  <TableHead>Recebida</TableHead>
                  <TableHead>Pendente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.slug}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-acid">R$ {r.confirmed}</TableCell>
                    <TableCell>R$ {r.pending}</TableCell>
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
