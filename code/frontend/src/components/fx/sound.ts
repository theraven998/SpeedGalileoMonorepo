"use client";

/**
 * Sonidos sintetizados con WebAudio. Sin archivos de audio.
 * AudioContext perezoso: se crea (o reanuda) en el primer uso, dentro de un
 * gesto del usuario, para no chocar con las políticas de autoplay.
 */

const MUTE_KEY = "sg-muted";

let ctx: AudioContext | null = null;
let muted = false;
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(value: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // almacenamiento no disponible (modo privado, SSR, etc.): ignorar
  }
}

/** Inicializa el estado de mute desde localStorage la primera vez que se usa. */
let initialized = false;
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  muted = readMuted();
}

export function isMuted(): boolean {
  ensureInitialized();
  return muted;
}

export function setMuted(value: boolean): void {
  ensureInitialized();
  muted = value;
  writeMuted(value);
  listeners.forEach((fn) => fn());
}

export function toggleMuted(): void {
  setMuted(!isMuted());
}

/** Store minimalista compatible con useSyncExternalStore. */
export function subscribeMuted(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getMutedSnapshot(): boolean {
  return isMuted();
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  duration: number;
  start?: number;
  type?: OscillatorType;
  gain?: number;
  glideTo?: number;
  vibrato?: { rate: number; depth: number };
}

function tone(ac: AudioContext, opts: ToneOpts): void {
  const { freq, duration, start = 0, type = "sine", gain = 0.18, glideTo, vibrato } = opts;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);
  }

  let vibratoOsc: OscillatorNode | null = null;
  let vibratoGain: GainNode | null = null;
  if (vibrato) {
    vibratoOsc = ac.createOscillator();
    vibratoGain = ac.createGain();
    vibratoOsc.frequency.value = vibrato.rate;
    vibratoGain.gain.value = vibrato.depth;
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibratoOsc.start(t0);
    vibratoOsc.stop(t0 + duration + 0.05);
  }

  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function play(fn: (ac: AudioContext) => void): void {
  if (isMuted()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    fn(ac);
  } catch {
    // sintetizador no disponible: silencioso, no debe romper la UI
  }
}

export function playTap(): void {
  play((ac) => tone(ac, { freq: 520, duration: 0.06, type: "square", gain: 0.08 }));
}

export function playCoin(): void {
  play((ac) => {
    tone(ac, { freq: 988, duration: 0.09, type: "square", gain: 0.12 });
    tone(ac, { freq: 1319, duration: 0.14, start: 0.07, type: "square", gain: 0.12 });
  });
}

export function playWhoosh(): void {
  play((ac) => tone(ac, { freq: 900, duration: 0.25, type: "sawtooth", gain: 0.05, glideTo: 120 }));
}

export function playLevelUp(): void {
  play((ac) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(ac, { freq: f, duration: 0.18, start: i * 0.08, type: "triangle", gain: 0.14 })
    );
  });
}

/** Temprano: arpegio mayor ascendente brillante con destellos agudos. */
export function playFanfare(): void {
  play((ac) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(ac, { freq: f, duration: 0.22, start: i * 0.07, type: "triangle", gain: 0.15 })
    );
    [1975.5, 2637].forEach((f, i) =>
      tone(ac, { freq: f, duration: 0.3, start: 0.35 + i * 0.05, type: "sine", gain: 0.06 })
    );
  });
}

/** A tiempo: dos notas alegres. */
export function playDing(): void {
  play((ac) => {
    tone(ac, { freq: 880, duration: 0.14, type: "triangle", gain: 0.15 });
    tone(ac, { freq: 1174.7, duration: 0.22, start: 0.1, type: "triangle", gain: 0.15 });
  });
}

/** Tarde: "wah wah wah wahhh" descendente, con vibrato triste en la última nota. */
export function playSadTrombone(): void {
  play((ac) => {
    const notes = [329.63, 311.13, 293.66, 277.18];
    notes.forEach((f, i) => {
      const isLast = i === notes.length - 1;
      tone(ac, {
        freq: f,
        duration: isLast ? 0.6 : 0.24,
        start: i * 0.26,
        type: "sawtooth",
        gain: 0.11,
        glideTo: isLast ? f * 0.85 : undefined,
        vibrato: isLast ? { rate: 6, depth: 10 } : undefined,
      });
    });
  });
}

export function playError(): void {
  play((ac) => tone(ac, { freq: 140, duration: 0.18, type: "square", gain: 0.12 }));
}

export type OutcomeStatus = "temprano" | "a_tiempo" | "tarde" | "duplicado";

export function playOutcome(status: OutcomeStatus): void {
  switch (status) {
    case "temprano":
      playFanfare();
      return;
    case "a_tiempo":
      playDing();
      return;
    case "tarde":
      playSadTrombone();
      return;
    case "duplicado":
      playError();
      return;
  }
}
