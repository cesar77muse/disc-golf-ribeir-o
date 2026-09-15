import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentProfile } from "@/lib/profiles";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // null here means either the signup trigger hasn't inserted the row yet
    // or the lookup itself failed — the admin layout treats both the same as
    // "pending" instead of crashing the whole route.
    const profile = await fetchCurrentProfile().catch(() => null);
    return { user: data.user, profile };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
