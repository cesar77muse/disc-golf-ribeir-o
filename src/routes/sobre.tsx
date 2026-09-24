import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Target,
  HeartHandshake,
  Users2,
  Award,
  Flag,
  MapPin,
  Users,
  Disc3,
  Trophy,
  GraduationCap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PARTNERS, SITE } from "@/lib/site-data";
import hero from "@/assets/hero.jpg";
import okyPhoto from "@/assets/sobre/Oky.jpg";
import teamPhoto1 from "@/assets/sobre/IMG_5962.jpg";
import teamPhoto2 from "@/assets/sobre/IMG_5963.jpg";
import teamPhoto3 from "@/assets/sobre/IMG_5964.jpg";
import teamPhoto4 from "@/assets/sobre/IMG_5965.jpg";
import teamPhoto5 from "@/assets/sobre/IMG_5966.jpg";
import teamPhoto6 from "@/assets/sobre/IMG_5967.jpg";
import teamPhoto7 from "@/assets/sobre/IMG_5968.jpg";
import teamPhoto8 from "@/assets/sobre/IMG_5969.jpg";
import teamPhoto9 from "@/assets/sobre/IMG_5970.jpg";
import teamPhoto10 from "@/assets/sobre/IMG_5971.jpg";
import teamPhoto11 from "@/assets/sobre/IMG_5972.jpg";
import teamPhoto12 from "@/assets/sobre/IMG_5973.jpg";
import teamPhoto13 from "@/assets/sobre/IMG_5974.jpg";

const TEAM_PHOTOS = [
  okyPhoto,
  teamPhoto1,
  teamPhoto2,
  teamPhoto3,
  teamPhoto4,
  teamPhoto5,
  teamPhoto6,
  teamPhoto7,
  teamPhoto8,
  teamPhoto9,
  teamPhoto10,
  teamPhoto11,
  teamPhoto12,
  teamPhoto13,
];

const MARQUEE_SIZES = [
  "h-36 w-52 sm:h-44 sm:w-64",
  "h-48 w-64 sm:h-60 sm:w-80",
  "h-40 w-56 sm:h-48 sm:w-72",
  "h-52 w-72 sm:h-64 sm:w-96",
];

const MARQUEE_PHOTOS = TEAM_PHOTOS.map((photo, i) => ({
  photo,
  size: MARQUEE_SIZES[i % MARQUEE_SIZES.length],
}));

const OSCAR_STATS = [
  { value: "20+", label: "anos no Ultimate Frisbee" },
  { value: "2022", label: "Campeão Nacional Amador" },
  { value: "#295306", label: "Atleta PDGA desde 2024" },
  { value: "1º", label: "treinador PDGA LatAm no Brasil" },
];

const OSCAR_BIO = [
  {
    icon: Disc3,
    title: "Origem e paixão pelos esportes com disco",
    paragraphs: [
      "Oscar Mauricio Leon é colombiano, radicado no Brasil há mais de 15 anos, e construiu sua trajetória esportiva por meio dos esportes com disco, atuando como jogador, treinador, dirigente e incentivador do desenvolvimento dessas modalidades no Brasil.",
      "Sua história com os esportes com disco começou há mais de duas décadas, especialmente com o Ultimate Frisbee, modalidade na qual atua há mais de 20 anos como jogador e treinador. Ao longo dessa trajetória, acumulou experiência dentro e fora das quadras, contribuindo para a formação de novos atletas e para a expansão da cultura dos esportes com disco.",
    ],
  },
  {
    icon: Trophy,
    title: "A chegada ao Disc Golf",
    paragraphs: [
      "Em 2017, Oscar teve seu primeiro contato competitivo com o Disc Golf, participando de um torneio realizado em Piracicaba, São Paulo. Em sua primeira experiência em competição, conquistou o 2º lugar na categoria Amador, resultado que marcou o início de uma nova etapa em sua trajetória esportiva.",
      "A partir daí, passou a se dedicar cada vez mais ao Disc Golf, participando de competições e aprofundando seus conhecimentos técnicos e estratégicos sobre a modalidade.",
      "Em 2022, alcançou um dos principais resultados de sua carreira como atleta ao conquistar o título de Campeão Nacional na categoria Amador, consolidando sua presença no cenário competitivo brasileiro.",
    ],
  },
  {
    icon: Users,
    title: "Atuação em Ribeirão Preto e criação da AJED",
    paragraphs: [
      "Morando atualmente em Ribeirão Preto, São Paulo, Oscar passou a dedicar parte importante de sua atuação ao desenvolvimento dos esportes com disco na região.",
      "É presidente da AJED — Associação dos Jogadores de Esportes com Disco, entidade que trabalha para promover, desenvolver e ampliar o acesso a modalidades como Disc Golf e Ultimate Frisbee.",
      "Como atleta, é jogador registrado na Professional Disc Golf Association (PDGA), número #295306, desde 2024. Desde 2025, também atua como Diretor de Torneios PDGA, participando da organização e desenvolvimento de competições oficiais de Disc Golf.",
      "Sua atuação também inclui a formação técnica de novos praticantes e profissionais. Oscar possui certificação como treinador de Disc Golf reconhecido pela PDGA Latinoamérica, sendo atualmente o único treinador no Brasil aprovado por essa organização, fortalecendo seu papel na formação e profissionalização da modalidade no país.",
    ],
  },
  {
    icon: GraduationCap,
    title: "Formação e desenvolvimento do Disc Golf",
    paragraphs: [
      "Além da atuação competitiva e administrativa, Oscar tem direcionado seus esforços para a educação e popularização do Disc Golf.",
      "Por meio da AJED, desenvolve oficinas itinerantes de esportes com disco em universidades, levando o conhecimento sobre a história, regras, fundamentos e possibilidades pedagógicas do Disc Golf e do Ultimate Frisbee para estudantes de Educação Física.",
      "O objetivo é aproximar essas modalidades dos futuros profissionais da área, mostrando que os esportes com disco podem ser utilizados como ferramentas de educação, lazer, inclusão, desenvolvimento motor e prática esportiva.",
      "O trabalho também chega às escolas, onde as oficinas apresentam o Disc Golf como uma nova opção de esporte para crianças, jovens e para a comunidade, buscando ampliar o acesso à modalidade e formar uma nova geração de praticantes.",
    ],
  },
  {
    icon: Sparkles,
    title: "Uma trajetória dedicada aos esportes com disco",
    paragraphs: [
      "Com mais de 20 anos de experiência no Ultimate Frisbee e quase uma década de trajetória no Disc Golf, Oscar Leon atua hoje em diferentes frentes: atleta, treinador, diretor de torneios, dirigente e educador.",
      "Sua trajetória representa a união entre a experiência competitiva e o compromisso com o desenvolvimento esportivo. Por meio da AJED, busca não apenas praticar e competir, mas também criar oportunidades para que mais pessoas conheçam, pratiquem e se desenvolvam por meio dos esportes com disco.",
      "Seu trabalho em Ribeirão Preto contribui para fortalecer a presença do Disc Golf e do Ultimate Frisbee no interior de São Paulo e para aproximar essas modalidades das universidades, escolas e da comunidade.",
      "Oscar Leon acredita que o futuro dos esportes com disco passa pela formação de novos atletas, treinadores e profissionais, pela educação e, principalmente, pela criação de oportunidades para que cada vez mais pessoas possam descobrir o prazer de jogar.",
    ],
  },
];

function BioBlock({
  icon: Icon,
  title,
  paragraphs,
  index,
}: {
  icon: typeof Disc3;
  title: string;
  paragraphs: string[];
  index: number;
}) {
  const isAlt = index % 2 === 1;
  return (
    <div className="flex gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isAlt ? "bg-secondary/20" : "bg-primary/20"}`}
      >
        <Icon className={`h-5 w-5 ${isAlt ? "text-buzz" : "text-acid"}`} />
      </div>
      <div>
        <h3 className="font-bold">{title}</h3>
        {paragraphs.map((p, i) => (
          <p key={i} className="mt-3 text-sm text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — A Turma do Disc Golf" },
      { name: "description", content: "Conheça a Turma do Disc Golf: nossa história, valores e como promovemos o Disc Golf em Ribeirão Preto." },
      { property: "og:title", content: "Sobre — A Turma do Disc Golf" },
      { property: "og:description", content: "Conheça a Turma do Disc Golf: nossa história, valores e como promovemos o Disc Golf em Ribeirão Preto." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: hero },
      { name: "twitter:image", content: hero },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [activeBio, setActiveBio] = useState(0);

  return (
    <>
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          <img src={hero} alt="" className="h-full w-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold sm:text-5xl">Sobre a Turma</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Somos um grupo apaixonado por Disc Golf que acredita no poder do esporte para transformar pessoas e comunidades.
          </p>
        </div>
      </section>

      <section className="overflow-hidden py-6">
        <div
          className="animate-marquee flex w-max items-center gap-4"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          {[...MARQUEE_PHOTOS, ...MARQUEE_PHOTOS].map((item, idx) => (
            <div
              key={idx}
              className={`${item.size} shrink-0 overflow-hidden rounded-lg border border-border`}
            >
              <img
                src={item.photo}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover grayscale transition-all duration-500 hover:scale-110 hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">Nossa história</h2>
            <p className="mt-4 text-muted-foreground">
              A Turma do Disc Golf surgiu do desejo de popularizar o Disc Golf em Ribeirão Preto, um esporte que vem ganhando muito impulso globalmente.
            </p>
            <p className="mt-4 text-muted-foreground">
              Movido por Oky Leon, o projeto começou reunindo amigos, atletas e entusiastas para treinar em parques locais, criar conteúdo e organizar eventos na cidade para crescer em comunidade.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Nossos valores</h2>
            <ul className="mt-4 space-y-4">
              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Users2 className="h-5 w-5 text-acid" />
                </div>
                <div>
                  <p className="font-semibold">Comunidade</p>
                  <p className="text-sm text-muted-foreground">Aberto a todas as idades, famílias e níveis de habilidade.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                  <HeartHandshake className="h-5 w-5 text-buzz" />
                </div>
                <div>
                  <p className="font-semibold">Respeito</p>
                  <p className="text-sm text-muted-foreground">Espírito esportivo, cuidado com a natureza e ética de jogo.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Target className="h-5 w-5 text-acid" />
                </div>
                <div>
                  <p className="font-semibold">Evolução</p>
                  <p className="text-sm text-muted-foreground">Treinos regulares, feedback e competições para crescer junto.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                  <Award className="h-5 w-5 text-buzz" />
                </div>
                <div>
                  <p className="font-semibold">Excelência</p>
                  <p className="text-sm text-muted-foreground">Buscamos a melhor experiência em cada treino e evento.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-carbon">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Quem trabalha com a gente</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Desenvolvemos nossas atividades de mãos dadas com instituições que fortalecem o Disc Golf no Brasil e no mundo.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNERS.map((p) => (
              <div
                key={p.name}
                className="flex flex-col items-center rounded-xl border border-border bg-background p-6 transition-transform hover:-translate-y-1"
              >
                <img src={p.logo} alt={p.name} className="h-14 w-auto object-contain" />
                <p className="mt-4 text-sm text-muted-foreground">{p.fullName}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Quem lidera a Turma</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Conheça a trajetória de Oscar Leon, fundador da Turma do Disc Golf e presidente da AJED.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          <div className="lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
            <div className="relative overflow-hidden rounded-xl border border-border">
              <img src={okyPhoto} alt="Oscar Leon" className="aspect-[4/5] w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-5 pt-16">
                <h3 className="text-xl font-bold text-white">Oscar Leon</h3>
                <p className="text-sm text-white/80">Fundador da Turma do Disc Golf · Presidente da AJED</p>
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Flag className="h-4 w-4 shrink-0 text-acid" /> Colombiano, no Brasil há mais de 15 anos
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-acid" /> Ribeirão Preto, SP
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Award className="h-4 w-4 shrink-0 text-acid" /> Diretor de Torneios PDGA desde 2025
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div
              key={activeBio}
              className="animate-in fade-in slide-in-from-right-4 min-h-80 rounded-xl border border-border bg-carbon p-8 duration-300"
            >
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {activeBio + 1} / {OSCAR_BIO.length}
              </p>
              <div className="mt-4">
                {OSCAR_BIO[activeBio] && <BioBlock index={activeBio} {...OSCAR_BIO[activeBio]} />}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveBio((i) => (i - 1 + OSCAR_BIO.length) % OSCAR_BIO.length)}
                aria-label="Bloco anterior"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition hover:border-acid hover:text-acid"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                {OSCAR_BIO.map((block, i) => (
                  <button
                    key={block.title}
                    type="button"
                    onClick={() => setActiveBio(i)}
                    aria-label={block.title}
                    className={`h-2 rounded-full transition-all ${i === activeBio ? "w-6 bg-acid" : "w-2 bg-border"}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveBio((i) => (i + 1) % OSCAR_BIO.length)}
                aria-label="Próximo bloco"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-foreground transition hover:border-acid hover:text-acid"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {OSCAR_STATS.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border bg-carbon p-4">
                  <p className="text-xl font-bold text-buzz">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
