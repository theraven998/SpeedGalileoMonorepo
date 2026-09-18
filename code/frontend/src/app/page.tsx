"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth-context";
import { ROLE_HOME } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Reveal, playTap } from "@/components/fx";
import { Hero } from "@/components/landing/Hero";
import { ScoreCard } from "@/components/landing/ScoreCard";
import { ArrivalDemo } from "@/components/landing/ArrivalDemo";
import { RankingPreview } from "@/components/landing/RankingPreview";
import { WakeBackendButton } from "@/components/landing/WakeBackendButton";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace(ROLE_HOME[user.role]);
  }, [user, loading, router]);

  // Sesión activa detectada: no mostrar la landing, ya viene la redirección.
  if (user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="font-bold text-foreground-muted">Cargando...</p>
      </main>
    );
  }

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <QuienesSon />
        <ComoFunciona />
        <Puntos />
        <RankingPreview />
        <Estudio />
        <Final />
        <Creditos />
      </main>
      <WakeBackendButton />
    </>
  );
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mx-auto mb-9 max-w-lg text-center">
      <h2 className="text-[28px] font-black tracking-tight text-foreground sm:text-4xl">{title}</h2>
      <p className="mt-2.5 font-semibold text-foreground-muted">{sub}</p>
    </div>
  );
}

function QuienesSon() {
  return (
    <section id="equipo" className="border-b-2 border-border bg-background-alt px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <SectionHeading title="Quiénes son" sub="Dos compañeros del mismo colegio, con 400 años de diferencia." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Reveal>
            <article className="card-hard overflow-hidden pb-6 text-center transition-transform duration-150 hover:-translate-y-1">
              <div className="flex h-64 items-end justify-center bg-[#e9f7d6] pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/personajes/galileo-t.png"
                  alt="Gali con la sudadera del colegio y su catalejo"
                  className="h-60 w-auto max-w-none"
                />
              </div>
              <span className="relative -mt-4 inline-block rounded-full bg-[#3d6b0a] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_3px_0_rgba(0,0,0,.12)]">
                La mascota
              </span>
              <h3 className="mt-3 text-2xl font-black text-foreground">Gali</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm font-semibold text-foreground-muted">
                Galileo Galilei, el del nombre del colegio. Midió el tiempo antes que nadie; ahora
                cuida la portería con su catalejo.
              </p>
            </article>
          </Reveal>
          <Reveal delay={0.12}>
            <article className="card-hard overflow-hidden pb-6 text-center transition-transform duration-150 hover:-translate-y-1">
              <div className="flex h-64 items-end justify-center bg-[#ddf4ff] pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/personajes/diego-t.png"
                  alt="Diego con la sudadera del colegio, mostrando su carné con código QR"
                  className="h-60 w-auto max-w-none"
                />
              </div>
              <span className="relative -mt-4 inline-block rounded-full bg-[#0b6a95] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-[0_3px_0_rgba(0,0,0,.12)]">
                El autor
              </span>
              <h3 className="mt-3 text-2xl font-black text-foreground">Diego</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm font-semibold text-foreground-muted">
                Diego Alejandro Quintero Fuya, estudiante del Gimnasio Galileo Galilei. Construyó
                SpeedGalileo como proyecto de grado.
              </p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const PASOS = [
  {
    emoji: "🪪",
    bg: "bg-[#ddf4ff]",
    title: "1. Recibe tu carnet",
    text: "Coordinación te registra y te entrega tu carnet con código QR.",
  },
  {
    emoji: "🎫",
    bg: "bg-[#e7f9d8]",
    title: "2. Muestra tu QR",
    text: "El profesor lo escanea al entrar y tu hora queda registrada. No necesitas celular.",
  },
  {
    emoji: "🔭",
    bg: "bg-[#fff3d1]",
    title: "3. Sube en la liga",
    text: "Tus llegadas puntuales suman al % de tu curso en el tablero.",
  },
];

function PasoCard({ paso, delay }: { paso: (typeof PASOS)[number]; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="card-hard p-6 text-center transition-transform duration-150 hover:-translate-y-1">
        <motion.div
          className={`mx-auto mb-3.5 grid h-16 w-16 place-items-center rounded-full text-3xl ${paso.bg}`}
          whileHover={{ rotate: [0, -8, 7, -5, 3, 0] }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {paso.emoji}
        </motion.div>
        <h3 className="text-lg font-extrabold text-foreground">{paso.title}</h3>
        <p className="mt-1.5 text-sm font-semibold text-foreground-muted">{paso.text}</p>
      </div>
    </Reveal>
  );
}

function ComoFunciona() {
  return (
    <section id="como" className="px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title="Tres pasos y listo" sub="No necesitas celular. Quien escanea es el profesor, en la puerta." />
        <div className="grid gap-4 sm:grid-cols-3">
          {PASOS.map((p, i) => (
            <PasoCard key={p.title} paso={p} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Puntos() {
  return (
    <section id="puntos" className="border-y-2 border-border bg-background-alt px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <SectionHeading title="¿Cuántos puntos vale llegar?" sub="Portería cierra a las 7:30. Mientras más temprano, más puntos." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal>
            <ScoreCard kind="temprano" range="Antes de 7:20" points={3} caption="¡Perfecto!" />
          </Reveal>
          <Reveal delay={0.1}>
            <ScoreCard kind="a_tiempo" range="7:20 – 7:30" points={2} caption="Casi casi" />
          </Reveal>
          <Reveal delay={0.2}>
            <ScoreCard kind="tarde" range="Después de 7:30" points={0} caption="Portería cerrada" />
          </Reveal>
        </div>

        <ArrivalDemo />

        <Reveal>
          <div className="card-hard mx-auto mt-6 flex max-w-xl items-center gap-4 p-4 text-left">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#e9f7d6]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/personajes/cara-gali.png"
                alt=""
                className="h-full w-full scale-125 object-cover object-[50%_30%]"
              />
            </span>
            <p className="text-sm font-semibold text-foreground-muted">
              Gali calcula el <b className="font-extrabold text-foreground">% de llegadas puntuales</b> de
              cada curso, así que un curso grande no gana solo por tener más estudiantes. El tablero
              público nunca muestra quién llegó tarde, solo el resultado del curso — el detalle
              individual lo ve coordinación.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const FASES = [
  { titulo: "Semanas 1–2", texto: "Se registra todo, pero el tablero está oculto." },
  { titulo: "Semanas 3–4", texto: "Se publica el ranking y empieza la competencia." },
  { titulo: "Al final", texto: "Se comparan resultados y se encuesta a los estudiantes." },
];

function Estudio() {
  return (
    <section id="estudio" className="border-t-2 border-border bg-background-alt px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="card-hard grid items-end gap-6 p-6 pb-0 sm:grid-cols-[200px_1fr] sm:pb-0">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/personajes/diego-t.png" alt="Diego, autor del proyecto" className="h-64 w-auto max-w-none" />
            </div>
            <div className="speech-bubble mb-7 text-center sm:text-left">
              <h3 className="text-xl font-black text-foreground">Esto también es un experimento</h3>
              <p className="mt-2 text-base font-semibold text-foreground-muted">
                ¿Un sistema de recompensas grupales cambia la puntualidad de los estudiantes? ¿Y ese
                cambio es positivo, o termina generando presión y molestia entre compañeros? No se
                busca solo comprobar que &ldquo;funciona&rdquo;: el proyecto de Diego mide las dos
                cosas, comparando dos semanas sin el sistema contra dos semanas con el ranking
                publicado — incluso si el resultado sale negativo.
              </p>
            </div>
          </div>
        </Reveal>
        <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
          {FASES.map((f, i) => (
            <Reveal key={f.titulo} delay={i * 0.1}>
              <div className="card-hard border-b-2 p-4 transition-transform duration-150 hover:-translate-y-1">
                <b className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-accent">{f.titulo}</b>
                <p className="text-sm font-semibold text-foreground-muted">{f.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final() {
  return (
    <Reveal>
      <section className="px-4 py-16 text-center sm:py-[74px]">
        <h2 className="text-[28px] font-black tracking-tight text-foreground sm:text-4xl">
          ¿Listo para sumar por tu curso?
        </h2>
        <p className="mx-auto mt-2.5 max-w-sm font-semibold text-foreground-muted">
          Coordinación crea tu cuenta y te entrega tu carnet QR.
        </p>
        <Link href="/login" className="btn-3d mt-6 inline-block" onClick={() => playTap()}>
          Ingresar
        </Link>
      </section>
    </Reveal>
  );
}

function Creditos() {
  return (
    <footer className="border-t-2 border-border px-4 py-6 text-center text-sm font-bold text-foreground-muted">
      Diego Alejandro Quintero Fuya · Proyecto de grado · Gimnasio Galileo Galilei
      <small className="mt-1.5 block text-xs font-semibold opacity-75">
        Gali y Diego son ilustraciones originales generadas para este proyecto.
      </small>
    </footer>
  );
}
