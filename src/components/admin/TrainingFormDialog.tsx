import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  createTraining,
  updateTraining,
  slugifyTrainingTitle,
  type TrainingGeneralInput,
} from "@/lib/trainings";
import type { Training } from "@/lib/site-data";

const STATUS_LABEL: Record<Training["status"], string> = {
  active: "Ativo",
  suspended: "Suspenso",
};

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

/** ascii-fold + lowercase, used as the lookup key in DAY_ALIASES. */
function normalizeDayToken(token: string): string {
  return token
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Canonical singular forms plus the plural ("Quartas-feiras") style used by
// older hand-entered data, so editing a legacy training pre-selects its day.
const DAY_ALIASES: Record<string, (typeof WEEKDAYS)[number]> = {
  ...Object.fromEntries(WEEKDAYS.map((d) => [normalizeDayToken(d), d])),
  domingos: "Domingo",
  "segundas-feiras": "Segunda-feira",
  "tercas-feiras": "Ter\u00e7a-feira",
  "quartas-feiras": "Quarta-feira",
  "quintas-feiras": "Quinta-feira",
  "sextas-feiras": "Sexta-feira",
  sabados: "S\u00e1bado",
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

/** Native <input type="time"> renders AM/PM on some OS locales — explicit 00-23h dropdowns keep it unambiguous. */
function splitTime(time: string): [string, string] {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return match ? [match[1] ?? "", match[2] ?? ""] : ["", ""];
}

/** Recovers the weekday checkboxes that match a stored (possibly free-text, legacy) day string. */
function parseDays(day: string): string[] {
  const tokens = day
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const matched = tokens
    .map((t) => DAY_ALIASES[normalizeDayToken(t)])
    .filter((d): d is (typeof WEEKDAYS)[number] => d !== undefined);
  return WEEKDAYS.filter((d) => matched.includes(d));
}

type FormState = {
  title: string;
  days: string[];
  time: string;
  location: string;
  level: string;
  description: string;
  status: Training["status"];
  confirmed: boolean;
  visible: boolean;
};

function emptyForm(): FormState {
  return {
    title: "",
    days: [],
    time: "",
    location: "",
    level: "",
    description: "",
    status: "active",
    confirmed: true,
    visible: true,
  };
}

function formFromTraining(t: Training): FormState {
  return {
    title: t.title,
    days: parseDays(t.day),
    time: t.time,
    location: t.location,
    level: t.level,
    description: t.description,
    status: t.status,
    confirmed: t.confirmed,
    visible: t.visible,
  };
}

export function TrainingFormDialog({
  open,
  onOpenChange,
  training,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = criar treino novo */
  training: Training | undefined;
  onSaved: (training: Training) => void;
}) {
  const isEditing = training !== undefined;
  const [form, setForm] = useState<FormState>(() =>
    training ? formFromTraining(training) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(training ? formFromTraining(training) : emptyForm());
    setError(null);
  }, [open, training]);

  function toggleDay(day: string, checked: boolean) {
    setForm((f) => ({
      ...f,
      days: checked ? [...f.days, day] : f.days.filter((d) => d !== day),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.days.length === 0) {
      setError("Escolha pelo menos um dia da semana.");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(form.time)) {
      setError("Escolha o horário do treino.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const slug = isEditing ? training.id : slugifyTrainingTitle(form.title);
      const input: TrainingGeneralInput = {
        title: form.title,
        day: WEEKDAYS.filter((d) => form.days.includes(d)).join(", "),
        time: form.time,
        location: form.location,
        level: form.level,
        description: form.description,
        status: form.status,
        confirmed: form.confirmed,
        visible: form.visible,
      };
      const saved = isEditing
        ? await updateTraining(slug, input)
        : await createTraining(slug, input);
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("duplicate key") || message.includes("23505")) {
        setError("Já existe um treino com um título muito parecido. Tente um título diferente.");
      } else {
        setError(message || "Não foi possível salvar o treino.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar treino" : "Novo treino"}</DialogTitle>
          <DialogDescription>Dados do treino exibido na agenda do site.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-1 sm:col-span-2">
              <Label>Dias da semana</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between border-border bg-background font-normal"
                  >
                    <span className="truncate text-left">
                      {form.days.length > 0 ? form.days.join(", ") : "Selecione os dias"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[var(--radix-dropdown-menu-trigger-width)] border-border bg-card"
                >
                  {WEEKDAYS.map((day) => (
                    <DropdownMenuCheckboxItem
                      key={day}
                      checked={form.days.includes(day)}
                      onCheckedChange={(checked) => toggleDay(day, checked)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {day}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-1">
              <Label>Horário</Label>
              {(() => {
                const [hour, minute] = splitTime(form.time);
                return (
                  <div className="flex items-center gap-2">
                    <Select
                      value={hour}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, time: `${v}:${minute || "00"}` }))
                      }
                    >
                      <SelectTrigger aria-label="Hora" className="border-border bg-background">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground">:</span>
                    <Select
                      value={minute}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, time: `${hour || "00"}:${v}` }))
                      }
                    >
                      <SelectTrigger aria-label="Minuto" className="border-border bg-background">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {MINUTES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground">Relógio de 24 horas (00h–23h).</p>
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
              <Label htmlFor="level">Nível</Label>
              <Input
                id="level"
                required
                placeholder="Todos os níveis"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as Training["status"] }))}
              >
                <SelectTrigger id="status" className="border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as Training["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Suspenso mostra o treino como indisponível, sem escondê-lo do site.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="confirmed" className="text-sm">
                  Dia/horário confirmados
                </Label>
                <Switch
                  id="confirmed"
                  checked={form.confirmed}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, confirmed: v }))}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Se desligado, o site avisa que o horário ainda vai ser confirmado.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="visible" className="text-sm">
                  Visível no site
                </Label>
                <Switch
                  id="visible"
                  checked={form.visible}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, visible: v }))}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Se desligado, o treino some da página pública mas continua aqui no painel.
              </p>
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
              {isEditing ? "Salvar alterações" : "Criar treino"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
