import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Loader2, MapPin } from "lucide-react";
import { parseLocalDate, type Tournament } from "@/lib/site-data";
import { fetchPendingTournaments, setTournamentApprovalStatus } from "@/lib/tournaments";
import {
  fetchAllProfiles,
  updateProfileRole,
  updateProfileStatus,
  type ApprovalStatus,
  type Profile,
  type UserRole,
} from "@/lib/profiles";

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  organizador: "Organizador",
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_BADGE_CLASS: Record<ApprovalStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-acid text-background",
  rejected: "bg-destructive/10 text-destructive",
};

export const Route = createFileRoute("/_authenticated/admin/aprovacoes")({
  head: () => ({
    meta: [{ title: "Aprovações — Painel Administrativo" }],
  }),
  beforeLoad: ({ context }) => {
    if (context.profile?.role !== "super_admin") throw redirect({ to: "/admin" });
  },
  loader: async () => ({
    profiles: await fetchAllProfiles(),
    pendingTournaments: await fetchPendingTournaments(),
  }),
  component: AdminAprovacoes,
});

function AdminAprovacoes() {
  const { profiles: initialProfiles, pendingTournaments: initialPending } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [pending, setPending] = useState(initialPending);
  const [savingId, setSavingId] = useState<string | null>(null);

  const creatorEmailById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of profiles) map.set(p.id, p.email);
    return map;
  }, [profiles]);

  async function handleStatusChange(profile: Profile, status: ApprovalStatus) {
    setSavingId(profile.id);
    try {
      await updateProfileStatus(profile.id, status);
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, status } : p)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar o status.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleRoleChange(profile: Profile, role: UserRole) {
    setSavingId(profile.id);
    try {
      await updateProfileRole(profile.id, role);
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, role } : p)));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar o papel.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleTournamentDecision(tournament: Tournament, status: "approved" | "rejected") {
    setSavingId(tournament.id);
    try {
      await setTournamentApprovalStatus(tournament.id, status);
      setPending((prev) => prev.filter((t) => t.id !== tournament.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar o torneio.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Aprovações</h1>
        <p className="text-muted-foreground">
          Gerencie o acesso de usuários ao painel e aprove torneios antes de irem ao ar.
        </p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="torneios">
            Torneios pendentes
            {pending.length > 0 && (
              <Badge className="ml-2 bg-acid text-background">{pending.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => {
                    const isSelf = p.id === user.id;
                    const saving = savingId === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.email}</TableCell>
                        <TableCell>
                          <Select
                            value={p.role}
                            disabled={isSelf || saving}
                            onValueChange={(v) => handleRoleChange(p, v as UserRole)}
                          >
                            <SelectTrigger className="w-[160px] border-border bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABEL[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_BADGE_CLASS[p.status]}>
                            {STATUS_LABEL[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground">Sua conta</span>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {p.status !== "approved" && (
                                <Button
                                  size="sm"
                                  className="bg-acid text-background hover:bg-acid/90"
                                  disabled={saving}
                                  onClick={() => handleStatusChange(p, "approved")}
                                >
                                  {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                  Aprovar
                                </Button>
                              )}
                              {p.status !== "rejected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-border bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={saving}
                                  onClick={() => handleStatusChange(p, "rejected")}
                                >
                                  {p.status === "approved" ? "Revogar acesso" : "Rejeitar"}
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="torneios" className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">
                  Nenhum torneio aguardando aprovação.
                </p>
              </CardContent>
            </Card>
          ) : (
            pending.map((t) => {
              const saving = savingId === t.id;
              return (
                <Card key={t.id} className="border-border bg-card">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {parseLocalDate(t.date).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {t.location}
                        </span>
                        {t.createdBy && creatorEmailById.get(t.createdBy) && (
                          <span>Criado por {creatorEmailById.get(t.createdBy)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-acid text-background hover:bg-acid/90"
                        disabled={saving}
                        onClick={() => handleTournamentDecision(t, "approved")}
                      >
                        {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={saving}
                        onClick={() => handleTournamentDecision(t, "rejected")}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
