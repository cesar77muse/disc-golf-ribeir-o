import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, DollarSign, Dumbbell, Clock, MapPin } from "lucide-react";
import { parseLocalDate } from "@/lib/site-data";
import { fetchTournamentsForAdmin } from "@/lib/tournaments";
import { fetchTrainings } from "@/lib/trainings";
import { fetchRegistrations } from "@/lib/registrations";
import { statusLabel } from "@/components/TournamentCard";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — A Turma do Disc Golf" },
      { name: "description", content: "Gerencie torneios, inscrições e conteúdo do site." },
      { property: "og:title", content: "Painel Administrativo — A Turma do Disc Golf" },
      { property: "og:description", content: "Gerencie torneios, inscrições e conteúdo do site." },
      { property: "og:type", content: "website" },
    ],
  }),
  loader: async ({ context }) => ({
    tournaments: await fetchTournamentsForAdmin(context.profile),
    // Treinos is a Super Admin–only section (see AdminSidebar) — Organizador
    // shouldn't see any trace of it, including this dashboard summary.
    trainings: context.profile?.role === "super_admin" ? await fetchTrainings() : [],
    registrations: await fetchRegistrations(),
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { tournaments, trainings, registrations } = Route.useLoaderData();
  const { profile } = Route.useRouteContext();
  const isSuperAdmin = profile?.role === "super_admin";

  const nextTournament = tournaments[0];
  // Só conta quem já pagou: pagamento aprovado pelo Mercado Pago. Inscrição com
  // pagamento pendente/em análise/recusado não aparece no dashboard. Contagem e
  // receita saem da mesma lista, com o mesmo critério da página Financeiro.
  const paidRegistrations = nextTournament
    ? registrations.filter(
        (r) =>
          r.tournamentSlug === nextTournament.slug &&
          r.status !== "cancelled" &&
          r.paymentStatus === "approved",
      )
    : [];
  const registeredCount = paidRegistrations.length;
  const receivedRevenue = paidRegistrations.reduce((acc, r) => acc + (r.amountPaid ?? r.price), 0);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Painel da Turma</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? "Acompanhamento geral de torneios, treinos, inscrições e finanças."
            : "Acompanhamento geral dos seus torneios, inscrições e finanças."}
        </p>
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-2 ${isSuperAdmin ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      >
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <Trophy className="h-6 w-6 text-acid" />
            <p className="mt-2 text-sm text-muted-foreground">Torneios ativos</p>
            <p className="text-2xl font-bold">{tournaments.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <Calendar className="h-6 w-6 text-buzz" />
            <p className="mt-2 text-sm text-muted-foreground">Próximo torneio</p>
            <p className="text-lg font-bold">
              {tournaments[0]
                ? parseLocalDate(tournaments[0].date).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <Users className="h-6 w-6 text-acid" />
            <p className="mt-2 text-sm text-muted-foreground">Inscritos</p>
            <p className="text-2xl font-bold">{registeredCount}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <DollarSign className="h-6 w-6 text-buzz" />
            <p className="mt-2 text-sm text-muted-foreground">Receita recebida</p>
            <p className="text-2xl font-bold">R$ {receivedRevenue}</p>
          </CardContent>
        </Card>
        {isSuperAdmin && (
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <Dumbbell className="h-6 w-6 text-acid" />
              <p className="mt-2 text-sm text-muted-foreground">Treinos ativos</p>
              <p className="text-2xl font-bold">
                {trainings.filter((t) => t.status === "active").length}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className={`mt-10 grid gap-6 ${isSuperAdmin ? "lg:grid-cols-2" : ""}`}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Torneios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum torneio cadastrado.</p>
            )}
            {tournaments.map((t) => (
              <div
                key={t.slug}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
              >
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {parseLocalDate(t.date).toLocaleDateString("pt-BR")} — {t.location}
                  </p>
                </div>
                <Badge
                  variant={t.status === "open" ? "default" : "secondary"}
                  className={t.status === "open" ? "bg-acid text-background" : ""}
                >
                  {t.status === "open" ? "Aberto" : statusLabel(t.status)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Treinos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trainings.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum treino cadastrado.</p>
              )}
              {trainings.map((t) => (
                <div key={t.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{t.title}</p>
                    <Badge
                      variant={t.status === "active" ? "default" : "secondary"}
                      className={t.status === "active" ? "bg-acid text-background" : ""}
                    >
                      {t.status === "active" ? "Ativo" : "Suspenso"}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {t.day}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {t.time}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {t.location}
                    </span>
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
