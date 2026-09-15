import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, Users, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SITE, PARTNERS, USP_COURSE } from "@/lib/site-data";
import { fetchVisibleTrainings } from "@/lib/trainings";
import treinosImage from "@/assets/TreinosDG.png";
import uspMapImage from "@/assets/usp-course-map.png";
import udiscLogo from "@/assets/logoUDisc-white.png";

const uspPartner = PARTNERS.find((p) => p.name === "USP");

const GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${USP_COURSE.lat},${USP_COURSE.lng}`;

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos e Agenda — A Turma do Disc Golf" },
      { name: "description", content: "Veja nossa agenda de treinos abertos, aulas de iniciação e eventos especiais de Disc Golf em Ribeirão Preto." },
      { property: "og:title", content: "Treinos e Agenda — A Turma do Disc Golf" },
      { property: "og:description", content: "Veja nossa agenda de treinos abertos, aulas de iniciação e eventos especiais de Disc Golf em Ribeirão Preto." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: treinosImage },
      { name: "twitter:image", content: treinosImage },
    ],
  }),
  loader: async () => ({ trainings: await fetchVisibleTrainings() }),
  component: TrainingsPage,
});

function TrainingsPage() {
  const { trainings } = Route.useLoaderData();

  return (
    <>
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          <img src={treinosImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Treinos e Agenda</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Treinos regulares, aulas de iniciação e eventos especiais. Escolha o melhor momento para entrar na turma.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {trainings.map((t) => (
            <div key={t.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-acid text-acid">{t.level}</Badge>
                    {!t.confirmed && (
                      <Badge variant="outline" className="border-muted-foreground/40 text-xs font-normal text-muted-foreground">
                        Horário e local em breve
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-4 text-2xl font-bold">{t.title}</h2>
                  <p className="mt-3 text-muted-foreground">{t.description}</p>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-buzz" />
                      {t.day}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-buzz" />
                      {t.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-buzz" />
                      {t.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-buzz" />
                      Aberto à comunidade
                    </div>
                  </div>
                </div>
                <div className="flex lg:justify-end">
                  <Button asChild size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 lg:w-auto">
                    <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer">
                      {t.confirmed ? "Confirmar presença no WhatsApp" : "Perguntar no WhatsApp"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-2 lg:items-stretch">
          <div className="p-8 sm:p-10">
            <Badge variant="outline" className="border-acid text-acid">Campo parceiro</Badge>
            <h2 className="mt-4 text-2xl font-bold">Onde jogamos: Campo USP</h2>
            <p className="mt-4 text-muted-foreground">
              A USP Ribeirão Preto cede espaço no campus para um campo de Disc Golf aberto à comunidade — é lá que a Turma treina toda semana, ao lado de estudantes e visitantes.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xl font-bold text-acid">{USP_COURSE.holes}</p>
                <p className="text-xs text-muted-foreground">buracos</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xl font-bold text-acid">Par {USP_COURSE.par}</p>
                <p className="text-xs text-muted-foreground">campo completo</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xl font-bold text-acid">Grátis</p>
                <p className="text-xs text-muted-foreground">para jogar</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button asChild variant="outline" className="border-buzz text-buzz hover:bg-buzz/10 hover:text-buzz">
                <a href={USP_COURSE.udiscUrl} target="_blank" rel="noopener noreferrer">
                  Ver campo no
                  <img src={udiscLogo} alt="UDisc" className="h-4 w-auto" />
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              {uspPartner && <img src={uspPartner.logo} alt={uspPartner.fullName} className="h-9 w-auto object-contain opacity-80" />}
            </div>
          </div>
          <a
            href={GOOGLE_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block min-h-64 overflow-hidden lg:h-full"
          >
            <img
              src={uspMapImage}
              alt={`Mapa do ${USP_COURSE.name}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium text-buzz shadow group-hover:underline">
              Abrir no Google Maps <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        </div>
      </section>

      <section className="bg-carbon">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold">O que levar para o treino</h2>
              <ul className="mt-6 space-y-3">
                {[
                  "Água e protetor solar",
                  "Roupas confortáveis para caminhar no parque",
                  "Seus discos (ou peça emprestado conosco)",
                  "Bom humor e vontade de aprender",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-acid" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Fique por dentro</h2>
              <p className="mt-4 text-muted-foreground">
                A agenda pode mudar por causa de clima ou eventos especiais. Siga nosso Instagram para avisos e confirme presença pelo WhatsApp.
              </p>
              <div className="mt-6 flex gap-4">
                <Button asChild variant="outline" className="border-buzz text-buzz hover:bg-buzz/10 hover:text-buzz">
                  <a href={SITE.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
