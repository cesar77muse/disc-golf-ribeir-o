import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
  Archive,
  ArchiveRestore,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ImageOff,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  isTournamentPast,
  parseLocalDate,
  type PastTournament,
  type Tournament,
} from "@/lib/site-data";
import {
  fetchPastTournaments,
  fetchTournamentBySlug,
  fetchTournamentsForAdmin,
  deleteTournament,
  setTournamentArchived,
} from "@/lib/tournaments";
import { fetchRegistrations, type Registration } from "@/lib/registrations";
import { TournamentFormDialog } from "@/components/admin/TournamentFormDialog";
import { TournamentGalleryManager } from "@/components/admin/TournamentGalleryManager";
import { statusBadgeClass, statusLabel } from "@/components/TournamentCard";

const PAGE_SIZE = 5;
const ALL_PERIOD = "all";

/** Aprovado não mostra badge própria — some no meio dos outros torneios já publicados. */
const APPROVAL_LABEL: Record<"pending" | "rejected", string> = {
  pending: "Aguardando aprovação",
  rejected: "Rejeitado",
};

const APPROVAL_BADGE_CLASS: Record<"pending" | "rejected", string> = {
  pending: "bg-buzz/20 text-buzz",
  rejected: "bg-destructive/10 text-destructive",
};

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

export const Route = createFileRoute("/_authenticated/admin/torneios")({
  head: () => ({
    meta: [{ title: "Torneios — Painel Administrativo" }],
  }),
  loader: async ({ context }) => ({
    tournaments: await fetchTournamentsForAdmin(context.profile),
    registrations: await fetchRegistrations(),
    // Legacy historical results predate the created_by/ownership concept
    // entirely — nobody "owns" them, so only Super Admin manages them here.
    legacyPastTournaments:
      context.profile?.role === "super_admin" ? await fetchPastTournaments() : [],
  }),
  component: AdminTorneios,
});

function confirmedStatsFor(slug: string, registrations: Registration[]) {
  const confirmed = registrations.filter(
    (r) => r.tournamentSlug === slug && r.status === "confirmed",
  );
  return {
    count: confirmed.length,
    revenue: confirmed.reduce((acc, r) => acc + r.price, 0),
  };
}

/** Considera só a data (ignora arquivamento manual) — usado para decidir se "Desarquivar" faz sentido. */
function isPastByDateOnly(t: Tournament): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return (t.endDate ?? t.date) < today;
}

function paginate<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function PagerControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <Button
        size="sm"
        variant="outline"
        className="border-border bg-background"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-border bg-background"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

function TournamentLogoThumb({ image, title }: { image: string; title: string }) {
  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-acid/20 bg-carbon">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--color-acid)_0%,transparent_70%)] opacity-40 blur-2xl" />
      {image ? (
        <img
          src={image}
          alt={title}
          className="relative h-[82%] w-[82%] object-contain drop-shadow-lg"
        />
      ) : (
        <ImageOff className="relative h-5 w-5 text-muted-foreground" />
      )}
    </div>
  );
}

function TournamentActionsMenu({
  isArchiving,
  archiveAction,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  isArchiving: boolean;
  archiveAction: "archive" | "unarchive" | "none";
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="border-border bg-background"
          aria-label="Mais ações"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border bg-card">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        {archiveAction !== "none" && (
          <DropdownMenuItem onClick={onArchiveToggle} disabled={isArchiving}>
            {isArchiving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : archiveAction === "unarchive" ? (
              <ArchiveRestore className="mr-2 h-4 w-4" />
            ) : (
              <Archive className="mr-2 h-4 w-4" />
            )}
            {archiveAction === "unarchive" ? "Desarquivar" : "Arquivar agora"}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TournamentHeaderRow({
  image,
  title,
  date,
  location,
  badge,
}: {
  image: string;
  title: string;
  date: string;
  location: string;
  badge: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <TournamentLogoThumb image={image} title={title} />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold">{title}</p>
          {badge}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {parseLocalDate(date).toLocaleDateString("pt-BR")}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {location}
          </span>
        </p>
      </div>
    </div>
  );
}

function ManagedPastTournamentCard({
  t,
  stats,
  manuallyArchived,
  isArchiving,
  onEdit,
  onArchiveToggle,
  onDelete,
  onPhotosChange,
}: {
  t: Tournament;
  stats: { count: number; revenue: number };
  manuallyArchived: boolean;
  isArchiving: boolean;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onPhotosChange: (photos: string[]) => void;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TournamentHeaderRow
            image={t.image}
            title={t.title}
            date={t.date}
            location={t.location}
            badge={
              <Badge variant="outline" className={statusBadgeClass("closed")}>
                {statusLabel("closed")}
              </Badge>
            }
          />
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="border-border bg-background">
              <Link to="/admin/inscricoes" search={{ torneio: t.slug }}>
                <Users className="mr-1 h-3 w-3" /> Ver inscritos
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-acid text-acid hover:bg-acid/10 hover:text-acid"
            >
              <Link to="/torneios/$slug" params={{ slug: t.slug }}>
                Ver no site <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            <TournamentActionsMenu
              isArchiving={isArchiving}
              archiveAction={manuallyArchived ? "unarchive" : "none"}
              onEdit={onEdit}
              onArchiveToggle={onArchiveToggle}
              onDelete={onDelete}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Inscritos confirmados
            </p>
            <p className="text-lg font-bold">{stats.count}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Receita confirmada
            </p>
            <p className="text-lg font-bold text-acid">R$ {stats.revenue}</p>
          </div>
        </div>

        <TournamentGalleryManager slug={t.slug} photos={t.photos ?? []} onChange={onPhotosChange} />
      </CardContent>
    </Card>
  );
}

function LegacyPastTournamentCard({ t }: { t: PastTournament }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <TournamentHeaderRow
            image={t.image}
            title={t.title}
            date={t.date}
            location={t.location}
            badge={
              <Badge variant="outline" className={statusBadgeClass("closed")}>
                {statusLabel("closed")}
              </Badge>
            }
          />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="border-acid text-acid hover:bg-acid/10 hover:text-acid"
          >
            <Link to="/torneios/$slug" params={{ slug: t.slug }}>
              Ver no site <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Inscritos confirmados
            </p>
            <p className="text-lg font-bold text-muted-foreground">N/A</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" /> Receita confirmada
            </p>
            <p className="text-lg font-bold text-muted-foreground">N/A</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type PastItem =
  { kind: "managed"; tournament: Tournament } | { kind: "legacy"; tournament: PastTournament };

function AdminTorneios() {
  const {
    tournaments: initialTournaments,
    registrations,
    legacyPastTournaments,
  } = Route.useLoaderData();
  const [tournaments, setTournaments] = useState(initialTournaments);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | undefined>(undefined);
  const [archivingSlug, setArchivingSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tournament | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(ALL_PERIOD);
  const [activePage, setActivePage] = useState(1);
  const [pastPage, setPastPage] = useState(1);

  const activeTournaments = tournaments.filter((t) => !isTournamentPast(t));
  const pastTournaments = tournaments.filter((t) => isTournamentPast(t));

  const years = useMemo(() => {
    const set = new Set([
      ...tournaments.map((t) => parseLocalDate(t.date).getFullYear()),
      ...legacyPastTournaments.map((t) => parseLocalDate(t.date).getFullYear()),
    ]);
    return [...set].sort((a, b) => b - a);
  }, [tournaments, legacyPastTournaments]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setActivePage(1);
    setPastPage(1);
  }

  function handlePeriodChange(value: string) {
    setPeriod(value);
    setActivePage(1);
    setPastPage(1);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (title: string) => title.toLowerCase().includes(normalizedSearch);

  const filteredActive = activeTournaments.filter(
    (t) => matchesSearch(t.title) && matchesPeriod(t.date, period),
  );
  const activeTotalPages = Math.max(1, Math.ceil(filteredActive.length / PAGE_SIZE));
  const pagedActive = paginate(filteredActive, activePage);

  const pastItems: PastItem[] = [
    ...pastTournaments.map((t): PastItem => ({ kind: "managed", tournament: t })),
    ...legacyPastTournaments.map((t): PastItem => ({ kind: "legacy", tournament: t })),
  ]
    .filter(
      (item) => matchesSearch(item.tournament.title) && matchesPeriod(item.tournament.date, period),
    )
    .sort((a, b) => (a.tournament.date < b.tournament.date ? 1 : -1));
  const pastTotalPages = Math.max(1, Math.ceil(pastItems.length / PAGE_SIZE));
  const pagedPastItems = paginate(pastItems, pastPage);

  const hasActiveFilter = search.trim() !== "" || period !== ALL_PERIOD;

  function upsertTournament(t: Tournament) {
    setTournaments((prev) => {
      const exists = prev.some((x) => x.slug === t.slug);
      const next = exists ? prev.map((x) => (x.slug === t.slug ? t : x)) : [...prev, t];
      return [...next].sort((a, b) => (a.date < b.date ? -1 : 1));
    });
  }

  function openCreate() {
    setEditingTournament(undefined);
    setFormOpen(true);
  }

  function openEdit(t: Tournament) {
    setEditingTournament(t);
    setFormOpen(true);
  }

  async function handleArchiveToggle(t: Tournament, archived: boolean) {
    setArchivingSlug(t.slug);
    try {
      await setTournamentArchived(t.slug, archived);
      const updated = await fetchTournamentBySlug(t.slug);
      if (updated) upsertTournament(updated);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível atualizar o torneio.");
    } finally {
      setArchivingSlug(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTournament(deleteTarget.slug);
      setTournaments((prev) => prev.filter((x) => x.slug !== deleteTarget.slug));
      setDeleteTarget(null);
      setDeleteConfirmText("");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir o torneio.");
    } finally {
      setDeleting(false);
    }
  }

  function handlePhotosChange(slug: string, photos: string[]) {
    setTournaments((prev) => prev.map((t) => (t.slug === slug ? { ...t, photos } : t)));
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Torneios</h1>
          <p className="text-muted-foreground">Torneios cadastrados, categorias e preços.</p>
        </div>
        <Button className="bg-acid text-background hover:bg-acid/90" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Novo torneio
        </Button>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar torneio por título…"
            className="border-border bg-background pl-9"
          />
        </div>
        <Select value={period} onValueChange={handlePeriodChange}>
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

      <div className="space-y-4">
        {pagedActive.length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-5 text-sm text-muted-foreground">
              {tournaments.length === 0
                ? "Nenhum torneio cadastrado."
                : filteredActive.length === 0 && hasActiveFilter
                  ? "Nenhum torneio ativo corresponde aos filtros."
                  : "Nenhum torneio ativo no momento."}
            </CardContent>
          </Card>
        )}
        {pagedActive.map((t) => (
          <Card key={t.slug} className="border-border bg-card">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <TournamentHeaderRow
                  image={t.image}
                  title={t.title}
                  date={t.date}
                  location={t.location}
                  badge={
                    <>
                      <Badge variant="outline" className={statusBadgeClass(t.status)}>
                        {statusLabel(t.status)}
                      </Badge>
                      {t.approvalStatus && t.approvalStatus !== "approved" && (
                        <Badge className={APPROVAL_BADGE_CLASS[t.approvalStatus]}>
                          {APPROVAL_LABEL[t.approvalStatus]}
                        </Badge>
                      )}
                    </>
                  }
                />
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-border bg-background"
                  >
                    <Link to="/admin/inscricoes" search={{ torneio: t.slug }}>
                      <Users className="mr-1 h-3 w-3" /> Ver inscritos
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="border-acid text-acid hover:bg-acid/10 hover:text-acid"
                  >
                    <Link to="/torneios/$slug" params={{ slug: t.slug }}>
                      Ver no site <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                  <TournamentActionsMenu
                    isArchiving={archivingSlug === t.slug}
                    archiveAction="archive"
                    onEdit={() => openEdit(t)}
                    onArchiveToggle={() => handleArchiveToggle(t, true)}
                    onDelete={() => setDeleteTarget(t)}
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {t.divisions.map((div) => (
                  <div
                    key={div.name}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    <p className="font-medium">{div.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {div.prices.map((p) => `${p.label}: R$ ${p.price}`).join(" · ") ||
                        "Sem preço cadastrado"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PagerControls page={activePage} totalPages={activeTotalPages} onChange={setActivePage} />

      <div className="mt-10">
        <h2 className="text-xl font-bold">Torneios passados</h2>
        <p className="text-sm text-muted-foreground">
          Arquivados automaticamente quando a data do torneio passa (ou manualmente, a qualquer
          momento) — inscrições e receita continuam contando no Financeiro.
        </p>

        <div className="mt-4 space-y-4">
          {pagedPastItems.length === 0 && (
            <Card className="border-border bg-card">
              <CardContent className="p-5 text-sm text-muted-foreground">
                {pastItems.length === 0 && hasActiveFilter
                  ? "Nenhum torneio passado corresponde aos filtros."
                  : "Nenhum torneio passado ainda."}
              </CardContent>
            </Card>
          )}
          {pagedPastItems.map((item) =>
            item.kind === "managed" ? (
              <ManagedPastTournamentCard
                key={item.tournament.slug}
                t={item.tournament}
                stats={confirmedStatsFor(item.tournament.slug, registrations)}
                manuallyArchived={
                  Boolean(item.tournament.archivedAt) && !isPastByDateOnly(item.tournament)
                }
                isArchiving={archivingSlug === item.tournament.slug}
                onEdit={() => openEdit(item.tournament)}
                onArchiveToggle={() => handleArchiveToggle(item.tournament, false)}
                onDelete={() => setDeleteTarget(item.tournament)}
                onPhotosChange={(photos) => handlePhotosChange(item.tournament.slug, photos)}
              />
            ) : (
              <LegacyPastTournamentCard key={item.tournament.slug} t={item.tournament} />
            ),
          )}
        </div>
        <PagerControls page={pastPage} totalPages={pastTotalPages} onChange={setPastPage} />
      </div>

      <TournamentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tournament={editingTournament}
        onSaved={upsertTournament}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o torneio e, junto com ele,{" "}
              <strong>todas as inscrições e o histórico financeiro associados</strong> — a exclusão
              não pode ser desfeita. Para confirmar, digite o título do torneio abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={deleteTarget?.title}
            className="border-border bg-background"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || deleteConfirmText !== deleteTarget?.title}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
