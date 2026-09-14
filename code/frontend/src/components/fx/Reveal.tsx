"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "./useReducedMotion";

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Distancia inicial en px del deslizamiento hacia arriba. */
  distance?: number;
  once?: boolean;
}

/** Anima al entrar en viewport: fade + slide + ligera escala. */
export function Reveal({ children, delay = 0, className, distance = 16, once = true }: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount: "some" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const groupVariants: Variants = {
  hidden: {},
  show: (staggerDelay: number) => ({ transition: { staggerChildren: staggerDelay } }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
}

/** Contenedor que escalona la entrada de sus <RevealItem> hijos. */
export function RevealGroup({ children, className, staggerDelay = 0.08, once = true }: RevealGroupProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      // "some": con un umbral proporcional, un grupo más alto que la pantalla nunca se revelaría.
      viewport={{ once, amount: "some" }}
      custom={staggerDelay}
      variants={groupVariants}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
