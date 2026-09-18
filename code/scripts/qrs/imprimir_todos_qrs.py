#!/usr/bin/env python3
"""
Genera e imprime los stickers QR de TODOS los estudiantes subidos (mismo
tamaño y distribución que las etiquetas de equipos de SIGME: 3 QR por hoja).
Correr cuando ya estén cargados todos los estudiantes.

Uso:
  python3 imprimir_todos_qrs.py                # todos los cursos
  python3 imprimir_todos_qrs.py <courseId>      # un curso, por ObjectId
  python3 imprimir_todos_qrs.py "Décimo"        # un curso, por nombre

Requiere: pip install qrcode pillow requests
Impresora destino (CUPS): SAT — cambia sticker_qrs.PRINTER si usas otra.
"""
import sys

from sticker_qrs import PRINTER, fetch_students, generar_paginas, imprimir, login, resolve_course_id

OUT_DIR = "qrs_output"


def main() -> None:
    course_id = resolve_course_id(sys.argv[1]) if len(sys.argv) > 1 else None

    token = login()
    students = fetch_students(token, course_id)
    if not students:
        raise SystemExit("No hay estudiantes para imprimir.")

    print(f"{len(students)} estudiante(s) encontrados.")
    paths = generar_paginas(students, OUT_DIR)
    print(f"{len(paths)} hoja(s) generada(s) en {OUT_DIR}/.")

    if input(f"\nImprimir en '{PRINTER}'? (s/N): ").strip().lower() != "s":
        raise SystemExit("Cancelado. Las hojas quedan generadas para imprimir manualmente.")

    imprimir(paths)
    print("\nListo.")


if __name__ == "__main__":
    main()
