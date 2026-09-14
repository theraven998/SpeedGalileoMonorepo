"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { playTap, useReducedMotion } from "@/components/fx";

const CLOUDS = [
  { left: "6%", top: "12%", size: 52 },
  { left: "80%", top: "8%", size: 38 },
  { left: "44%", top: "4%", size: 30 },
];

const STARS = [
  { left: "18%", top: "24%", size: 18 },
  { left: "90%", top: "34%", size: 14 },
  { left: "62%", top: "14%", size: 12 },
  { left: "10%", top: "50%", size: 10 },
];

const HEADING_LINES: { text: string; accent?: boolean }[] = [
  { text: "Llega temprano." },
  { text: "Suma puntos." },
  { text: "Gana tu curso.", accent: true },
];

function AnimatedHeading() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <h1 className="text-[32px] font-black leading-[1.14] tracking-tight text-foreground sm:text-[42px]">
        Llega temprano.
        <br />
        Suma puntos.
        <br />
        <span className="text-primary">Gana tu curso.</span>
      </h1>
    );
  }

  let wordIndex = 0;
  return (
    <h1 className="text-[32px] font-black leading-[1.14] tracking-tight text-foreground sm:text-[42px]">
      {HEADING_LINES.map((line) => (
        <span key={line.text} className={`block ${line.accent ? "text-primary" : ""}`}>
          {line.text.split(" ").map((word) => {
            const i = wordIndex++;
            return (
              <motion.span
                key={word + i}
                className="inline-block"
                style={{ marginRight: "0.28em" }}
                initial={{ opacity: 0, y: -26, rotate: -10, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.09, type: "spring", bounce: 0.55, duration: 0.6 }}
              >
                {word}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/**
 * Entrada con squash & stretch y luego flote continuo. No usa <Mascot> porque
 * necesita ancho responsivo (min(420px,88vw)) y Mascot fija el tamaño en px.
 */
function HeroMascot() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { scale: 0.35, opacity: 0, y: -90, rotate: -6 }}
      animate={{ scale: [0.35, 1.16, 0.9, 1.04, 1], opacity: 1, y: [-90, 6, -12, 4, 0], rotate: [-6, 4, -2, 0] }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      <motion.img
        src="/personajes/duo-t.png"
        alt="Gali, la mascota inspirada en Galileo Galilei, con el brazo sobre el hombro de Diego; los dos con la sudadera del Gimnasio Galileo Galilei"
        className="w-[min(420px,88vw)]"
        draggable={false}
        animate={reducedMotion ? undefined : { y: [0, -10, 0], rotate: [0, -1.5, 0, 1.5, 0] }}
        transition={reducedMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
      />
    </motion.div>
  );
}

function SkyBackground({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const cloudsY = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const starsY = useTransform(scrollYProgress, [0, 1], [0, -110]);
  const starsOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);

  if (reducedMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <motion.div style={{ y: cloudsY }} className="absolute inset-0">
        {CLOUDS.map((c) => (
          <span
            key={c.left}
            className="absolute select-none opacity-90"
            style={{ left: c.left, top: c.top, fontSize: c.size }}
          >
            ☁️
          </span>
        ))}
      </motion.div>
      <motion.div style={{ y: starsY, opacity: starsOpacity }} className="absolute inset-0">
        {STARS.map((s) => (
          <span key={s.left + s.top} className="absolute select-none" style={{ left: s.left, top: s.top, fontSize: s.size }}>
            ✨
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Hero() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-b-2 border-border bg-background-alt px-4 pb-9 pt-11"
    >
      <SkyBackground sectionRef={sectionRef} />

      <div className="relative mx-auto grid max-w-5xl items-center gap-8 sm:grid-cols-2">
        <div className="text-center sm:text-left">
          <AnimatedHeading />
          <motion.p
            className="mx-auto mt-3.5 max-w-md text-lg font-semibold text-foreground-muted sm:mx-0"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            Gali y Diego te esperan en la portería. Muestra tu QR antes de las 7:20 y súbele el % de
            puntualidad a todo tu salón.
          </motion.p>
          <motion.div
            className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start"
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <Link href="/registro" className="btn-3d animate-shine" onClick={() => playTap()}>
              Empezar ahora
            </Link>
            <Link href="/login" className="btn-3d btn-3d-outline" onClick={() => playTap()}>
              Ya tengo cuenta
            </Link>
          </motion.div>
        </div>
        <div className="order-first grid place-items-center sm:order-none">
          <HeroMascot />
        </div>
      </div>
    </section>
  );
}
