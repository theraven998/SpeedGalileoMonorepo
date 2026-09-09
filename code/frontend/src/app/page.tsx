"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ROLE_HOME, api, type RankingEntry } from "@/lib/api";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RankingRow } from "@/components/RankingRow";

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
    </>
  );
}

function Hero() {
  return (
    <section className="overflow-hidden border-b-2 border-border bg-background-alt px-4 pb-9 pt-11">
      <div className="mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-2">
        <div className="animate-fade-up text-center sm:text-left">
          <h1 className="text-[32px] font-black leading-[1.14] tracking-tight text-foreground sm:text-[42px]">
            Llega temprano.
            <br />
            Suma puntos.
            <br />
            <span className="text-primary">Gana tu curso.</span>
          </h1>
          <p className="mx-auto mt-3.5 max-w-md text-lg font-semibold text-foreground-muted sm:mx-0">
            Gali y Diego te esperan en la portería. Muestra tu QR antes de las 7:20 y súbele el
            promedio a todo tu salón.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
            <Link href="/registro" className="btn-3d">
              Empezar ahora
            </Link>
            <Link href="/login" className="btn-3d btn-3d-outline">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
        <div className="order-first grid place-items-center sm:order-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/personajes/duo-t.png"
            alt="Gali, la mascota inspirada en Galileo Galilei, con el brazo sobre el hombro de Diego; los dos con la sudadera del Gimnasio Galileo Galilei"
            className="animate-float w-[min(420px,88vw)]"
          />
        </div>
      </div>
    </section>
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
          <article className="card-hard animate-fade-up fade-up-1 overflow-hidden pb-6 text-center">
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
          <article className="card-hard animate-fade-up fade-up-2 overflow-hidden pb-6 text-center">
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
        </div>
      </div>
    </section>
  );
}

const PASOS = [
  {
    emoji: "📱",
    bg: "bg-[#ddf4ff]",
    title: "1. Regístrate",
    text: "Elige tu curso y escribe el código de invitación que te dieron.",
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
    text: "Tus puntos se suman al promedio de tu curso en el tablero.",
  },
];

function ComoFunciona() {
  return (
    <section id="como" className="px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <SectionHeading title="Tres pasos y listo" sub="No necesitas celular. Quien escanea es el profesor, en la puerta." />
        <div className="grid gap-4 sm:grid-cols-3">
          {PASOS.map((p, i) => (
            <div
              key={p.title}
              className={`card-hard animate-fade-up fade-up-${i + 1} p-6 text-center`}
            >
              <div className={`mx-auto mb-3.5 grid h-16 w-16 place-items-center rounded-full text-3xl ${p.bg}`}>
                {p.emoji}
              </div>
              <h3 className="text-lg font-extrabold text-foreground">{p.title}</h3>
              <p className="mt-1.5 text-sm font-semibold text-foreground-muted">{p.text}</p>
            </div>
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
          <div className="score-tile score-tile--g animate-fade-up fade-up-1">
            <div className="text-sm font-extrabold opacity-90">Antes de 7:20</div>
            <div className="my-1 text-[52px] font-black leading-none">3</div>
            <div className="text-xs font-extrabold uppercase tracking-widest opacity-95">¡Perfecto!</div>
          </div>
          <div className="score-tile score-tile--y animate-fade-up fade-up-2">
            <div className="text-sm font-extrabold opacity-90">7:20 – 7:30</div>
            <div className="my-1 text-[52px] font-black leading-none">2</div>
            <div className="text-xs font-extrabold uppercase tracking-widest opacity-95">Casi casi</div>
          </div>
          <div className="score-tile score-tile--r animate-fade-up fade-up-3">
            <div className="text-sm font-extrabold opacity-90">Después de 7:30</div>
            <div className="my-1 text-[52px] font-black leading-none">0</div>
            <div className="text-xs font-extrabold uppercase tracking-widest opacity-95">Portería cerrada</div>
          </div>
        </div>
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
            Gali promedia los puntos <b className="font-extrabold text-foreground">por estudiante</b>, así que un
            curso grande no gana solo por tener más gente. Los puntos se suman al promedio de cada
            curso; el tablero público nunca muestra quién llegó tarde, solo el resultado del
            curso — el detalle individual lo ve coordinación.
          </p>
        </div>
      </div>
    </section>
  );
}

function RankingPreview() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .ranking()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="liga" className="px-4 py-14 sm:py-16">
      <div className="mx-auto max-w-xl">
        <SectionHeading title="Liga de cursos" sub="Promedio de puntos de esta semana" />

        {loading && <p className="text-center font-bold text-foreground-muted">Cargando...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-center font-bold text-foreground-muted">Aún no hay registros.</p>
        )}

        <ul className="space-y-3">
          {entries.map((entry, i) => (
            <RankingRow key={entry.courseId} entry={entry} position={i} />
          ))}
        </ul>

        {entries.length > 0 && (
          <p className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-foreground-muted">
            🔒 Nadie ve quién llegó tarde. Solo el resultado del curso.
          </p>
        )}

        <Link href="/ranking" className="mt-6 block text-center text-sm font-extrabold text-primary">
          Ver tablero completo →
        </Link>
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
        <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
          {FASES.map((f) => (
            <div key={f.titulo} className="card-hard border-b-2 p-4">
              <b className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-accent">{f.titulo}</b>
              <p className="text-sm font-semibold text-foreground-muted">{f.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final() {
  return (
    <section className="px-4 py-16 text-center sm:py-[74px]">
      <h2 className="text-[28px] font-black tracking-tight text-foreground sm:text-4xl">
        ¿Listo para sumar por tu curso?
      </h2>
      <p className="mx-auto mt-2.5 max-w-sm font-semibold text-foreground-muted">
        Solo necesitas el código de invitación de tu salón.
      </p>
      <Link href="/registro" className="btn-3d mt-6 inline-block">
        Crear mi cuenta
      </Link>
    </section>
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
