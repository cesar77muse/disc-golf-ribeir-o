import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  EyeOff,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { fetchTrainings, deleteTraining } from "@/lib/trainings";
import type { Training } from "@/lib/site-data";
import { TrainingFormDialog } from "@/components/admin/TrainingFormDialog";

export const Route = createFileRoute("/_authenticated/admin/treinos")({
  head: () => ({
    meta: [{ title: "Treinos — Painel Administrativo" }],
  }),
  beforeLoad: ({ context }) => {
    if (context.profile?.role !== "super_admin") throw redirect({ to: "/admin" });
  },
  loader: async () => ({
    trainings: await fetchTrainings(),
  }),
  component: AdminTreinos,
});

function AdminTreinos() {
  const { trainings: initialTrainings } = Route.useLoaderData();
  const [trainings, setTrainings] = useState(initialTrainings);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState(false);

  function upsertTraining(t: Training) {
    setTrainings((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
  }

  function openCreate() {
    setEditingTraining(undefined);
    setFormOpen(true);
  }

  function openEdit(t: Training) {
    setEditingTraining(t);
    setFormOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTraining(deleteTarget.id);
      setTrainings((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Não foi possível excluir o treino.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Treinos</h1>
          <p className="text-muted-foreground">Treinos semanais cadastrados no site.</p>
        </div>
        <Button className="bg-acid text-background hover:bg-acid/90" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Novo treino
        </Button>
      </div>

      <div className="space-y-3">
        {trainings.length === 0 && (
          <Card className="border-border bg-card">
            <CardContent className="p-5 text-sm text-muted-foreground">
              Nenhum treino cadastrado.
            </CardContent>
          </Card>
        )}
        {trainings.map((t) => (
          <Card key={t.id} className="border-border bg-card">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{t.title}</p>
                  {!t.confirmed && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Não confirmado
                    </Badge>
                  )}
                  <Badge
                    variant={t.status === "active" ? "default" : "secondary"}
                    className={t.status === "active" ? "bg-acid text-background" : ""}
                  >
                    {t.status === "active" ? "Ativo" : "Suspenso"}
                  </Badge>
                  {!t.visible && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-muted-foreground/40 text-muted-foreground"
                    >
                      <EyeOff className="h-3 w-3" /> Oculto do site
                    </Badge>
                  )}
                </div>

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
                    <DropdownMenuItem onClick={() => openEdit(t)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(t)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <span>Nível: {t.level}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <TrainingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        training={editingTraining}
        onSaved={upsertTraining}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso apaga o treino definitivamente — a exclusão não pode ser desfeita. Se você só
              quer escondê-lo do site, use "Editar" e desligue "Visível no site".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
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
