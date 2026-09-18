// Where the "Esqueceu sua senha?" e-mail lands (redirectTo in auth.tsx).
// Supabase appends the recovery token to the URL; the client picks it up on
// init and signs the user in with a recovery session, which is what allows
// updateUser({ password }) below without the old password.
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";

// Supabase's default minimum (Authentication → Providers → Email).
const MIN_PASSWORD_LENGTH = 6;

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — A Turma do Disc Golf" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

type LinkState = "checking" | "ready" | "invalid";

/** Supabase reports expired or already-used links in the URL hash. */
function linkErrorFromHash(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return params.get("error_description") ?? params.get("error");
}

function ResetPasswordPage() {
  const router = useRouter();
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (linkErrorFromHash()) {
      setLinkState("invalid");
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setLinkState("ready");
    });
    // getSession waits for the client to finish reading the token from the URL.
    supabase.auth.getSession().then(({ data }) => {
      setLinkState(data.session ? "ready" : "invalid");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada!");
      router.navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a senha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-md items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <Card className="w-full border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent>
          {linkState === "checking" && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {linkState === "invalid" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Este link de recuperação é inválido ou expirou. Peça um novo na página de login.
              </p>
              <Button
                asChild
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Link to="/auth">Voltar para o login</Link>
              </Button>
            </div>
          )}

          {linkState === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="bg-background pl-9"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Salvar nova
                senha
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
