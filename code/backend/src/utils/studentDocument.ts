/** Documento de identidad del estudiante: normalización y validación. */

// Quita espacios, puntos y guiones; deja mayúsculas.
export function normalizeDocument(raw: string): string {
  return raw.replace(/[\s.-]/g, "").toUpperCase();
}

export function isValidDocument(doc: string): boolean {
  return /^[A-Z0-9]{5,15}$/.test(doc);
}
