import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Dumbbell,
  Trophy,
  ClipboardList,
  DollarSign,
  Disc,
  ShieldCheck,
} from "lucide-react";
import type { UserRole } from "@/lib/profiles";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
// Lockup empilhado (emblema sobre o wordmark) na versão para fundo escuro — o
// sufixo `-light` nos assets significa "para fundo claro", que não serve aqui:
// a sidebar é #0b0c10.
import logo from "@/assets/logo-vertical.png";

// Organizador só tem acesso ao que o pedido de roles listou: Dashboard,
// Torneios, Inscrições e Financeiro. Treinos e Aprovações ficam exclusivos do
// Super Admin (a rota de Treinos também é bloqueada no beforeLoad).
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true, superAdminOnly: false },
  { to: "/admin/torneios", label: "Torneios", icon: Trophy, exact: false, superAdminOnly: false },
  {
    to: "/admin/inscricoes",
    label: "Inscrições",
    icon: ClipboardList,
    exact: false,
    superAdminOnly: false,
  },
  {
    to: "/admin/financeiro",
    label: "Financeiro",
    icon: DollarSign,
    exact: false,
    superAdminOnly: false,
  },
  { to: "/admin/treinos", label: "Treinos", icon: Dumbbell, exact: false, superAdminOnly: true },
  {
    to: "/admin/aprovacoes",
    label: "Aprovações",
    icon: ShieldCheck,
    exact: false,
    superAdminOnly: true,
  },
] as const;

export function AdminSidebar({ role }: { role: UserRole }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navItems = NAV_ITEMS.filter((item) => !item.superAdminOnly || role === "super_admin");

  return (
    <Sidebar collapsible="icon">
      {/* Sem divisória: o lockup empilhado é mais alto que a barra superior do
          painel, então uma borda aqui não alinharia com a de lá.
          items-center: SidebarHeader é flex-col e o `stretch` padrão deformaria o logo. */}
      <SidebarHeader className="items-center justify-center px-4 py-5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-4">
        {/* Link do router (e não <a>): este subárvore só renderiza no cliente
            (_authenticated tem ssr: false), então não há estado a divergir na
            hidratação — diferente do link para /admin no header do site. */}
        <Link
          to="/"
          title="Voltar ao site"
          aria-label="Voltar ao site"
          className="flex items-center justify-center rounded-md transition-opacity hover:opacity-80"
        >
          {/* O lockup não cabe na rail de 3rem, então lá ele dá lugar ao ícone. */}
          <img src={logo} alt="" className="h-14 w-auto group-data-[collapsible=icon]:hidden" />
          <Disc className="hidden h-6 w-6 text-acid group-data-[collapsible=icon]:block" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2 py-3">
          <SidebarGroupLabel>Painel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.to}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
