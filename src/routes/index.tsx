import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ArrowRight, Calendar, MapPin, Users, Trophy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/site-data";
import { fetchNextTournament } from "@/lib/tournaments";
import { fetchOpenTraining } from "@/lib/trainings";
import hero from "@/assets/fondoInicio2.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "A Turma do Disc Golf — Disc Golf em Ribeirão Preto" },
      { name: "description", content: "Grupo esportivo de Disc Golf em Ribeirão Preto. Treinos, campeonatos e muita diversão ao ar livre." },
      { property: "og:title", content: "A Turma do Disc Golf — Disc Golf em Ribeirão Preto" },
      { property: "og:description", content: "Grupo esportivo de Disc Golf em Ribeirão Preto. Treinos, campeonatos e muita diversão ao ar livre." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: hero },
      { name: "twitter:image", content: hero },
    ],
  }),
  loader: async () => {
    const [nextTournament, openTraining] = await Promise.all([
      fetchNextTournament(),
      fetchOpenTraining(),
    ]);
    return { nextTournament, openTraining };
  },
  component: HomePage,
});

function HomePage() {
  const { nextTournament, openTraining } = Route.useLoaderData();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={hero}
            alt="Cesta de Disc Golf com o símbolo da Turma, na floresta ao entardecer"
            className="h-full w-full object-cover"
            width={1536}
            height={1024}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[80vh] max-w-7xl items-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-acid text-acid">
              Esporte • Natureza • Comunidade
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Jogue <span className="text-gradient-brand">Disc Golf</span> em Ribeirão Preto
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Somos um grupo esportivo que promove, ensina e pratica o Disc Golf na região. Venha treinar, competir e fazer parte da turma.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/torneios">
                  Ver torneios <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-buzz text-buzz hover:bg-buzz/10 hover:text-buzz">
                <Link to="/treinos">Encontrar treinos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick info cards */}
      <section className="mx-auto -mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/treinos" className="block">
            <Card className="h-full border-border bg-card/80 backdrop-blur transition-colors hover:border-acid">
              <CardContent className="p-5">
                <Calendar className="h-6 w-6 text-acid" />
                <p className="mt-2 text-sm text-muted-foreground">Próximo treino</p>
                <p className="font-semibold">
                  {openTraining ? `${openTraining.day}, ${openTraining.time}` : "Sem treinos agendados no momento."}
                </p>
              </CardContent>
            </Card>
          </Link>
          {nextTournament ? (
            <Link to="/torneios/$slug" params={{ slug: nextTournament.slug }} className="block">
              <Card className="h-full border-border bg-card/80 backdrop-blur transition-colors hover:border-buzz">
                <CardContent className="p-5">
                  <Trophy className="h-6 w-6 text-buzz" />
                  <p className="mt-2 text-sm text-muted-foreground">Próximo torneio</p>
                  <p className="font-semibold">{nextTournament.title}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Link to="/torneios" className="block">
              <Card className="h-full border-border bg-card/80 backdrop-blur transition-colors hover:border-buzz">
                <CardContent className="p-5">
                  <Trophy className="h-6 w-6 text-buzz" />
                  <p className="mt-2 text-sm text-muted-foreground">Próximo torneio</p>
                  <p className="font-semibold">Nenhum torneio agendado no momento.</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Card className="border-border bg-card/80 backdrop-blur">
            <CardContent className="p-5">
              <MapPin className="h-6 w-6 text-acid" />
              <p className="mt-2 text-sm text-muted-foreground">Onde jogamos</p>
              <p className="font-semibold">{SITE.city}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/80 backdrop-blur">
            <CardContent className="p-5">
              <Users className="h-6 w-6 text-buzz" />
              <p className="mt-2 text-sm text-muted-foreground">Comunidade</p>
              <p className="font-semibold">Aberto a todos</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* About teaser */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Quem somos</h2>
            <p className="mt-4 text-muted-foreground">
              A Turma do Disc Golf nasceu da vontade de reunir pessoas ao redor de um esporte acessível, divertido e desafiador. Sob a coordenação de {SITE.director}, realizamos treinos, eventos e campeonatos para todos os níveis.
            </p>
            <p className="mt-4 text-muted-foreground">
              Trabalhamos de perto com USP, AJED, Disc Golf Brasil e PDGA para fortalecer o Disc Golf em Ribeirão Preto e região.
            </p>
            <Button asChild variant="link" className="mt-2 p-0 text-acid">
              <Link to="/sobre">Conheça nossa história <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="relative mx-auto w-full max-w-xs">
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-acid/20 to-buzz/20 blur-2xl" />
            <AboutVideo />
          </div>
        </div>
      </section>

      {/* Learn teaser */}
      <section className="bg-carbon">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Nunca jogou?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Disc Golf é fácil de começar e difícil de abandonar. Aprenda as regras, conheça os discos e venha fazer o primeiro arremesso com a gente.
            </p>
            <Button asChild className="mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Link to="/aprenda">Aprenda Disc Golf</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function AboutVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className="relative aspect-[4/5] w-full rounded-2xl bg-carbon object-cover"
      src="/videos/turma-disc-golf.mp4"
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Vídeo da turma jogando Disc Golf"
    />
  );
}
