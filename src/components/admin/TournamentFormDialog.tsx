import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTournament,
  updateTournament,
  uploadTournamentLogo,
  slugifyTournamentTitle,
  saveTournamentDivisions,
  fetchTournamentBySlug,
  DEFAULT_TOURNAMENT_DIVISIONS,
  MAX_TOURNAMENT_IMAGE_BYTES,
  type TournamentGeneralInput,
} from "@/lib/tournaments";
import {
  fetchPartners,
  ensureDefaultPartnerLogos,
  createPartner,
  deletePartner,
  type PartnerRecord,
} from "@/lib/partners";
import type { Tournament } from "@/lib/site-data";

const STATUS_LABEL: Record<Tournament["status"], string> = {
  open: "Aberto",
  closed: "Fechado",
  waitlist: "Lista de espera",
};

type DivisionPriceFormState = { label: string; price: string };
type DivisionFormState = { name: string; prices: DivisionPriceFormState[] };

type FormState = {
  title: string;
  date: string;
  endDate: string;
  registrationDeadline: string;
  registrationDeadlineConfirmed: boolean;
  location: string;
  description: string;
  status: Tournament["status"];
  pricesApproximate: boolean;
  pdgaLink: string;
  divisions: DivisionFormState[];
};

function defaultDivisions(): DivisionFormState[] {
  return DEFAULT_TOURNAMENT_DIVISIONS.map((d) => ({
    name: d.name,
    prices: d.priceLabels.map((label) => ({ label, price: "" })),
  }));
}

function emptyForm(): FormState {
  return {
    title: "",
    date: "",
    endDate: "",
    registrationDeadline: "",
    registrationDeadlineConfirmed: true,
    location: "",
    description: "",
    status: "open",
    pricesApproximate: false,
    pdgaLink: "",
    divisions: defaultDivisions(),
  };
}

function formFromTournament(t: Tournament): FormState {
  return {
    title: t.title,
    date: t.date,
    endDate: t.endDate ?? "",
    registrationDeadline: t.registrationDeadline,
    registrationDeadlineConfirmed: t.registrationDeadlineConfirmed,
    location: t.location,
    description: t.description,
    status: t.status,
    pricesApproximate: t.pricesApproximate ?? false,
    pdgaLink: t.pdgaLink ?? "",
    divisions:
      t.divisions.length > 0
        ? t.divisions.map((d) => ({
            name: d.name,
            prices: d.prices.map((p) => ({ label: p.label, price: String(p.price) })),
          }))
        : defaultDivisions(),
  };
}

const DARK_NATIVE_CONTROL_STYLE = { colorScheme: "dark" } as const;

export function TournamentFormDialog({
  open,
  onOpenChange,
  tournament,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = criar torneio novo */
  tournament: Tournament | undefined;
  onSaved: (tournament: Tournament) => void;
}) {
  const isEditing = tournament !== undefined;
  const [form, setForm] = useState<FormState>(() =>
    tournament ? formFromTournament(tournament) : emptyForm(),
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [visiblePartners, setVisiblePartners] = useState<PartnerRecord[]>([]);
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerFile, setNewPartnerFile] = useState<File | null>(null);
  const [addingPartner, setAddingPartner] = useState(false);
  const [addPartnerError, setAddPartnerError] = useState<string | null>(null);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);
  const newPartnerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(tournament ? formFromTournament(tournament) : emptyForm());
    setLogoFile(null);
    setLogoError(null);
    setError(null);
    setNewPartnerName("");
    setNewPartnerFile(null);
    setAddPartnerError(null);

    setPartnersLoading(true);
    (async () => {
      try {
        let all = await fetchPartners();
        all = await ensureDefaultPartnerLogos(all);
        const existingIds = tournament?.sponsorPartnerIds ?? [];
        // Só entram na lista visível os padrões + o que já está vinculado a
        // ESTE torneio — parcerias pontuais de outros torneios ficam de fora.
        const visible = all
          .filter((p) => p.isDefaultSponsor || existingIds.includes(p.id))
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setVisiblePartners(visible);
        setSelectedPartnerIds(
          existingIds.length > 0
            ? existingIds
            : all.filter((p) => p.isDefaultSponsor).map((p) => p.id),
        );
      } catch {
        setVisiblePartners([]);
        setSelectedPartnerIds([]);
      } finally {
        setPartnersLoading(false);
      }
    })();
  }, [open, tournament]);

  function togglePartner(id: string, checked: boolean) {
    setSelectedPartnerIds((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  async function handleAddPartner() {
    if (!newPartnerName.trim() || !newPartnerFile) {
      setAddPartnerError("Informe um nome e escolha um logo.");
      return;
    }
    if (newPartnerFile.size > MAX_TOURNAMENT_IMAGE_BYTES) {
      setAddPartnerError("A imagem passa de 10 MB. Escolha um arquivo menor.");
      return;
    }
    setAddingPartner(true);
    setAddPartnerError(null);
    try {
      const created = await createPartner(
        newPartnerName.trim(),
        newPartnerFile,
        visiblePartners.length,
      );
      setVisiblePartners((prev) => [...prev, created]);
      setSelectedPartnerIds((prev) => [...prev, created.id]);
      setNewPartnerName("");
      setNewPartnerFile(null);
    } catch (err) {
      setAddPartnerError(
        err instanceof Error ? err.message : "Não foi possível adicionar o parceiro.",
      );
    } finally {
      setAddingPartner(false);
    }
  }

  async function handleDeletePartner(partner: PartnerRecord) {
    if (!window.confirm(`Excluir a parceria "${partner.name}"? Isso não pode ser desfeito.`)) {
      return;
    }
    setDeletingPartnerId(partner.id);
    try {
      await deletePartner(partner.id, partner.logoUrl);
      setVisiblePartners((prev) => prev.filter((p) => p.id !== partner.id));
      setSelectedPartnerIds((prev) => prev.filter((id) => id !== partner.id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir a parceria.");
    } finally {
      setDeletingPartnerId(null);
    }
  }

  function handleLogoChange(file: File | null) {
    setLogoError(null);
    if (file && file.size > MAX_TOURNAMENT_IMAGE_BYTES) {
      setLogoError("A imagem passa de 10 MB. Escolha um arquivo menor.");
      setLogoFile(null);
      return;
    }
    setLogoFile(file);
  }

  function updatePrice(divisionIndex: number, priceIndex: number, value: string) {
    setForm((f) => ({
      ...f,
      divisions: f.divisions.map((d, di) =>
        di !== divisionIndex
          ? d
          : {
              ...d,
              prices: d.prices.map((p, pi) => (pi !== priceIndex ? p : { ...p, price: value })),
            },
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let imageUrl = tournament?.image;
      const slug = isEditing ? tournament.slug : slugifyTournamentTitle(form.title);
      if (logoFile) {
        imageUrl = await uploadTournamentLogo(slug, logoFile);
      }
      const input: TournamentGeneralInput = {
        title: form.title,
        date: form.date,
        registrationDeadline: form.registrationDeadline,
        registrationDeadlineConfirmed: form.registrationDeadlineConfirmed,
        location: form.location,
        description: form.description,
        status: form.status,
        pricesApproximate: form.pricesApproximate,
        sponsorPartnerIds: selectedPartnerIds,
        ...(form.endDate ? { endDate: form.endDate } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        ...(form.pdgaLink ? { pdgaLink: form.pdgaLink } : {}),
      };
      const saved = isEditing
        ? await updateTournament(slug, input)
        : await createTournament(slug, input);
      await saveTournamentDivisions(
        saved.id,
        form.divisions.map((d) => ({
          name: d.name,
          prices: d.prices.map((p) => ({ label: p.label, price: Number(p.price) || 0 })),
        })),
      );
      const final = await fetchTournamentBySlug(slug);
      onSaved(final ?? saved);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("duplicate key") || message.includes("23505")) {
        setError("Já existe um torneio com um título muito parecido. Tente um título diferente.");
      } else {
        setError(message || "Não foi possível salvar o torneio.");
      }
    } finally {
      setSaving(false);
    }
  }

  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : tournament?.image;

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar torneio" : "Novo torneio"}</DialogTitle>
          <DialogDescription>Dados gerais, categorias e preços do torneio.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-acid/20 bg-carbon">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,var(--color-acid)_0%,transparent_70%)] opacity-40 blur-2xl" />
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt=""
                  className="relative h-[82%] w-[82%] object-contain drop-shadow-lg"
                />
              ) : (
                <ImageOff className="relative h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label>Logo do torneio</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-border bg-background"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-3 w-3" /> Escolher imagem
                </Button>
                <span className="truncate text-xs text-muted-foreground">
                  {logoFile ? logoFile.name : tournament?.image ? "Imagem atual" : "Nenhuma imagem"}
                </span>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                hidden
                onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Máx. 10 MB.</p>
              {logoError && <p className="text-xs text-destructive">{logoError}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                required
                style={DARK_NATIVE_CONTROL_STYLE}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">Data final (opcional)</Label>
              <Input
                id="endDate"
                type="date"
                style={DARK_NATIVE_CONTROL_STYLE}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="registrationDeadline">Prazo de inscrição</Label>
              <Input
                id="registrationDeadline"
                type="date"
                required
                style={DARK_NATIVE_CONTROL_STYLE}
                value={form.registrationDeadline}
                onChange={(e) => setForm((f) => ({ ...f, registrationDeadline: e.target.value }))}
              />
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="deadlineConfirmed" className="text-sm">
                  Prazo já é definitivo
                </Label>
                <Switch
                  id="deadlineConfirmed"
                  checked={form.registrationDeadlineConfirmed}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, registrationDeadlineConfirmed: v }))
                  }
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Se desligado, o site mostra a data com o aviso "(a confirmar)".
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                required
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">Status de inscrição</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as Tournament["status"] }))}
              >
                <SelectTrigger id="status" className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as Tournament["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="pricesApproximate" className="text-sm">
                  Preços ainda são estimativa
                </Label>
                <Switch
                  id="pricesApproximate"
                  checked={form.pricesApproximate}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, pricesApproximate: v }))}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Liga isso se os valores abaixo ainda podem mudar.
              </p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="pdgaLink">Link PDGA (opcional)</Label>
              <Input
                id="pdgaLink"
                value={form.pdgaLink}
                onChange={(e) => setForm((f) => ({ ...f, pdgaLink: e.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Categorias e preços</Label>
              <div className="space-y-2">
                {form.divisions.map((division, di) => (
                  <div
                    key={division.name}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="mb-2 text-sm font-medium">{division.name}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {division.prices.map((price, pi) => (
                        <div key={price.label} className="space-y-1">
                          <Label
                            htmlFor={`price-${di}-${pi}`}
                            className="text-xs text-muted-foreground"
                          >
                            {price.label}
                          </Label>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">R$</span>
                            <Input
                              id={`price-${di}-${pi}`}
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={price.price}
                              onChange={(e) => updatePrice(di, pi, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Parcerias exibidas no torneio</Label>
              {partnersLoading ? (
                <p className="text-xs text-muted-foreground">Carregando parceiros…</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visiblePartners.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 text-sm"
                    >
                      <label className="flex flex-1 cursor-pointer items-center gap-2 overflow-hidden">
                        <Checkbox
                          checked={selectedPartnerIds.includes(p.id)}
                          onCheckedChange={(checked) => togglePartner(p.id, checked === true)}
                        />
                        <span className="flex h-7 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-carbon">
                          {p.logoUrl && (
                            <img
                              src={p.logoUrl}
                              alt=""
                              className="h-full w-full object-contain p-1"
                            />
                          )}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </label>
                      {!p.isDefaultSponsor && (
                        <button
                          type="button"
                          disabled={deletingPartnerId === p.id}
                          onClick={() => handleDeletePartner(p)}
                          className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                          aria-label={`Excluir ${p.name}`}
                        >
                          {deletingPartnerId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Parceria pontual deste torneio — não vai aparecer como opção em outros torneios.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    placeholder="Nome do parceiro"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    className="max-w-[200px]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border bg-background"
                    onClick={() => newPartnerInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    {newPartnerFile ? newPartnerFile.name : "Escolher logo"}
                  </Button>
                  <input
                    ref={newPartnerInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    hidden
                    onChange={(e) => setNewPartnerFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-acid text-background hover:bg-acid/90"
                    disabled={addingPartner}
                    onClick={handleAddPartner}
                  >
                    {addingPartner && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    Adicionar
                  </Button>
                </div>
                {addPartnerError && (
                  <p className="mt-1 text-xs text-destructive">{addPartnerError}</p>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-acid text-background hover:bg-acid/90"
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Criar torneio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
