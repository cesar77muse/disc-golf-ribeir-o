import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Calendar, MapPin, Clock, ArrowLeft, Info, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { TournamentLogoTile } from "@/components/TournamentLogoTile";
import { TournamentRegisterForm } from "@/components/TournamentRegisterForm";
import { statusLabel, statusBadgeClass, formatDateRange } from "@/components/TournamentCard";
import { USP_COURSE, SITE, parseLocalDate, TOURNAMENT_DEFAULT_SPONSORS } from "@/lib/site-data";
import { fetchTournamentBySlug } from "@/lib/tournaments";
import hero from "@/assets/hero.jpg";
import uspMapImage from "@/assets/usp-course-map.png";
import okyPhoto from "@/assets/sobre/Oky.jpg";

const GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${USP_COURSE.lat},${USP_COURSE.lng}`;

export const Route = createFileRoute("/torneios_/$slug")({
  loader: async ({ params }) => {
    const tournament = await fetchTournamentBySlug(params.slug);
    if (!tournament) throw notFound();
    return tournament;
  },
  head: ({ loaderData: t }) => {
    return {
      meta: [
        { title: t ? `${t.title} — A Turma do Disc Golf` : "Torneio — A Turma do Disc Golf" },
        { name: "description", content: t ? t.description : "Detalhes do torneio de Disc Golf." },
        { property: "og:title", content: t ? `${t.title} — A Turma do Disc Golf` : "Torneio — A Turma do Disc Golf" },
        { property: "og:description", content: t ? t.description : "Detalhes do torneio de Disc Golf." },
        { property: "og:type", content: "website" },
        { property: "og:image", content: hero },
        { name: "twitter:image", content: hero },
      ],
    };
  },
  component: TournamentDetailPage,
});

function TournamentDetailPage() {
  const tournament = Route.useLoaderData();

  const isAtUsp = tournament.location === USP_COURSE.name;
  const sponsors = tournament.sponsors ?? TOURNAMENT_DEFAULT_SPONSORS;

  return (
    <>
      <section className="relative overflow-hidden py-16">
        <div className="absolute inset-0">
          <img src={hero} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="-ml-3 mb-4 px-3 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
            <Link to="/torneios">
              <ArrowLeft className="mr-2 h-4 w-4" /> Todos os torneios
            </Link>
          </Button>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <TournamentLogoTile logo={tournament.image} title={tournament.title} className="h-32 w-32 shrink-0 sm:h-44 sm:w-44 lg:h-[250px] lg:w-[250px]" />
            <div>
              <Badge variant="outline" className={statusBadgeClass(tournament.status)}>{statusLabel(tournament.status)}</Badge>
              <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{tournament.title}</h1>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4 text-lg text-foreground/90">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-6 w-6 text-acid" />
              {formatDateRange(tournament.date, tournament.endDate)}
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="h-6 w-6 text-acid" />
              {tournament.location}
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-6 w-6 text-buzz" />
              Inscrições até {parseLocalDate(tournament.registrationDeadline).toLocaleDateString("pt-BR")}
              {!tournament.registrationDeadlineConfirmed && " (a confirmar)"}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold">Sobre o torneio</h2>
            <p className="mt-4 text-muted-foreground">{tournament.description}</p>

            {tournament.pdgaLink && /^https?:\/\//i.test(tournament.pdgaLink) && (
              <Button asChild variant="outline" className="mt-5 border-acid text-acid hover:bg-acid/10 hover:text-acid">
                <a href={tournament.pdgaLink} target="_blank" rel="noopener noreferrer">
                  Ver torneio na PDGA <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            )}

            <h3 className="mt-10 text-xl font-bold">Divisões e valores</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tournament.divisions.map((d) => (
                <Card key={d.name} className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="font-semibold">{d.name}</p>
                    <div className="mt-1 space-y-1">
                      {d.prices.map((p) => (
                        <p key={p.label} className="text-sm text-muted-foreground">
                          {p.label}: <span className="text-lg font-bold text-acid">R$ {p.price}</span>
                        </p>
                      ))}
                    </div>
                    {d.spots !== undefined && <p className="mt-1 text-xs text-muted-foreground">{d.spots} vagas</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
            {tournament.pricesApproximate && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" /> Valores aproximados, sujeitos a confirmação.
              </p>
            )}

            {isAtUsp && (
              <>
                <h3 className="mt-10 text-xl font-bold">Como chegar</h3>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative mt-4 block h-56 overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={uspMapImage}
                    alt={`Mapa do ${USP_COURSE.name}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <p className="absolute bottom-3 left-3 text-sm font-medium text-white">{USP_COURSE.name}</p>
                  <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium text-buzz shadow group-hover:underline">
                    Abrir no Google Maps <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              </>
            )}

            <h3 className="mt-10 text-xl font-bold">Apoio e parceria</h3>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-border bg-card p-6">
              {sponsors.map((s) => (
                <img key={s.name} src={s.logo} alt={s.fullName} title={s.fullName} className="h-8 w-auto object-contain opacity-90 sm:h-10" />
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center sm:flex-row sm:text-left">
              <img src={okyPhoto} alt={SITE.director} className="h-16 w-16 shrink-0 rounded-full object-cover" />
              <div>
                <p className="font-semibold">Tem dúvidas sobre o torneio?</p>
                <p className="text-sm text-muted-foreground">Fale direto com {SITE.director}, nosso diretor.</p>
                <div className="mt-2 flex flex-wrap justify-center gap-4 sm:justify-start">
                  <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-acid hover:underline">
                    <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                  </a>
                  <a href={`mailto:${SITE.email}`} className="flex items-center gap-1.5 text-sm text-acid hover:underline">
                    <Mail className="h-4 w-4" /> E-mail
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div>
            <TournamentRegisterForm tournament={tournament} />
          </div>
        </div>
      </section>
    </>
  );
}
