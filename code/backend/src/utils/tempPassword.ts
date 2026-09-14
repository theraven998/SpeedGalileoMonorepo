import { randomInt } from "node:crypto";

// Sin símbolos ambiguos (0/O, 1/l/I, etc.)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const LENGTH = 10;

/** Contraseña temporal para altas de coordinación. Se muestra una sola vez. */
export function generateTempPassword(): string {
  let out = "";
  for (let i = 0; i < LENGTH; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}
