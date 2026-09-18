#!/usr/bin/env python3
"""
Prueba de bajada: descarga los estudiantes YA subidos (aún no son todos) y
genera sus hojas de sticker QR en disco, SIN imprimir. Sirve para confirmar
que la conexión con la API y la generación de QR funcionan antes de tener
la lista completa.

Uso:
  python3 probar_qrs.py                # todos los estudiantes subidos
  python3 probar_qrs.py <courseId>      # filtra por curso

Requiere: pip install qrcode pillow requests
"""
import sys

from sticker_qrs import fetch_students, generar_paginas, login, resolve_course_id

OUT_DIR = "qrs_output_prueba"


def main() -> None:
    course_id = resolve_course_id(sys.argv[1]) if len(sys.argv) > 1 else None

    token = login()
    students = fetch_students(token, course_id)
    if not students:
        print("No hay estudiantes subidos todavía.")
        return

    print(f"\nBajaron {len(students)} estudiante(s) correctamente:")
    for s in students:
        print(f"  - {s['name']} ({s['document']}) [{s['course']['name']}]")

    paths = generar_paginas(students, OUT_DIR)
    print(f"\n{len(paths)} hoja(s) generada(s) en {OUT_DIR}/ (no se imprimió nada).")


if __name__ == "__main__":
    main()
