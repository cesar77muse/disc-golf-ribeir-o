import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — A Turma do Disc Golf" },
      { name: "description", content: "Acesse o painel administrativo da Turma do Disc Golf." },
      { property: "og:title", content: "Entrar — A Turma do Disc Golf" },
      { property: "og:description", content: "Acesse o painel administrativo da Turma do Disc Golf." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.navigate({ to: "/admin" });
      }
    });
  }, [router]);

  const handleEmailLogin = async (mode: "signin" | "signup") => {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success(
          "Conta criada! Um Super Admin precisa aprovar seu acesso antes de você entrar no painel.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        router.navigate({ to: "/admin" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-md items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <Card className="w-full border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Painel da Turma</CardTitle>
          <p className="text-sm text-muted-foreground">Acesso exclusivo para organizadores.</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background pl-9" />
                </div>
                {/* Só visual por enquanto: a recuperação de senha ainda não foi implementada. */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-acid hover:underline"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>
              <Button onClick={() => handleEmailLogin("signin")} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Entrar
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background pl-9" />
                </div>
              </div>
              <Button onClick={() => handleEmailLogin("signup")} disabled={loading} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Criar conta
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
