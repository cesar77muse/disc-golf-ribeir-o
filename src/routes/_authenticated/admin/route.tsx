import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogOut, Loader2, Clock, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ROLE_LABEL = { super_admin: "Super Admin", organizador: "Organizador" } as const;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sair");
      setLoggingOut(false);
    }
  };

  return { loggingOut, handleLogout };
}

/** Shown instead of the panel while an account waits for (or was denied) Super Admin approval. */
function PendingApprovalScreen({ rejected }: { rejected: boolean }) {
  const { loggingOut, handleLogout } = useLogout();
  return (
    <section className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      <Card className="w-full border-border bg-card text-center">
        <CardHeader className="items-center">
          {rejected ? (
            <ShieldX className="h-10 w-10 text-destructive" />
          ) : (
            <Clock className="h-10 w-10 text-buzz" />
          )}
          <CardTitle className="mt-2">
            {rejected ? "Acesso não autorizado" : "Conta pendente de aprovação"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {rejected
              ? "Um Super Admin negou o acesso desta conta ao painel."
              : "Um Super Admin ainda precisa aprovar seu acesso ao painel. Tente novamente mais tarde."}
          </p>
          <Button
            variant="outline"
            className="border-border bg-background"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sair
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function AdminLayout() {
  const { profile } = Route.useRouteContext();
  const { loggingOut, handleLogout } = useLogout();

  if (!profile || profile.status !== "approved") {
    return <PendingApprovalScreen rejected={profile?.status === "rejected"} />;
  }

  return (
    // translate="no" + notranslate: o Google Tradutor reparenta nós de texto
    // (envolve em <font>) e continua remexendo neles a cada navegação da SPA,
    // brigando com o React durante o commit e derrubando a árvore com
    // "Failed to execute 'removeChild'". O painel é conteúdo interno em
    // português só para a equipe, então não há motivo pra deixá-lo traduzível.
    <SidebarProvider translate="no" className="notranslate">
      <AdminSidebar role={profile.role} />
      {/* min-w-0: sem isso as tabelas largas esticam o flex item em vez de rolar. */}
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-6" />
            <span className="truncate text-sm font-semibold">Painel Administrativo</span>
            <Badge
              variant={profile.role === "super_admin" ? "default" : "secondary"}
              className={profile.role === "super_admin" ? "bg-acid text-background" : ""}
            >
              {ROLE_LABEL[profile.role]}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-border bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Sair
          </Button>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
