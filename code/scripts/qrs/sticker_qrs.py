"""
Lógica compartida para generar e imprimir stickers QR de estudiantes en la
impresora SAT (HPRT HD2000Z, térmica directa, 203dpi). Usada por probar_qrs.py
e imprimir_todos_qrs.py.

Patrón de diseño (canvas vertical rotado 90°) y bug de escalado tomados de
`redes_qr.py` en ~/Proyects/Productos/atonik/tools/qrs/ (ya validado ahí en
físico para un rollo de etiquetas de la misma impresora SAT, aunque de otro
tamaño): la SAT estira cualquier imagen que no mida exactamente el tamaño de
página (`PageSize`), así que cada etiqueta se pega en su posición dentro de
una página completa w100h113 (799x904px @203dpi) y se manda con
`-o PageSize=w100h113`. El tamaño real de ESTA etiqueta (33x25mm) se midió con
regla — ver Obsidian `Software/Proyectos/Impresora-SAT/` para el detalle
completo de esta sesión y cómo reproducir el proceso en otro proyecto.

Fuente del dato: GET /api/students/qrs (solo coordinación), que expone el
qrToken de cada estudiante exclusivamente para este uso.
"""
import getpass
import os
import subprocess

import qrcode
import requests
from PIL import Image, ImageDraw, ImageFont


def _load_dotenv() -> None:
    """Carga GRADODIEGUI_EMAIL/GRADODIEGUI_PASSWORD desde un .env junto a este archivo
    (gitignored) si existen y no están ya en el entorno, para no pedir login cada vez."""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()

API_BASE = os.environ.get("GRADODIEGUI_API", "http://localhost:4000/api")
PRINTER = "SAT"

# ============================================================
# Geometría física (mm) — rollo SAT, 3 columnas por fila.
# MEDIDO CON REGLA sobre un sticker físico real (los intentos anteriores de
# 32x25 y 32x27 eran estimaciones que resultaron ligeramente equivocadas y
# causaban texto cortado): ancho 33mm, alto 25mm.
# ============================================================
DPI = 203  # resolución de la SAT (HPRT HD2000Z), única. No tocar.

LABEL_W_MM = 33.0  # ancho de la etiqueta física (a lo ancho del rollo), medido con regla
LABEL_H_MM = 25.0  # largo de la etiqueta física (a lo largo del rollo), medido con regla

PAGE_W_MM = 100.0  # ancho de página (rollo)
PAGE_H_MM = 113.0  # alto de página -> PageSize w100h113
GAP_X_MM = 0.5  # gap horizontal entre columnas: 3*33=99mm, solo queda 1mm para 2 gaps

QR_RATIO = 0.93  # lado del QR = 93% del lado menor (PORT_W). Con PORT_W=200 (25mm) deja ~2px de margen.
FONT_RATIO = 0.10  # tamaño de fuente = 10% del lado menor
GAP_RATIO = 0.03  # separación QR-texto = 3% del lado menor
# Antes de rotar 90°, "x alto" queda "arriba" en la etiqueta física ya impresa.
H_SHIFT_MM = 0.6  # ajuste óptico del QR en el eje PORT_W (mm)
# El texto tiene su propio sesgo, independiente del QR: si comparte H_SHIFT, un
# nombre ancho baja su extremo de x chico hasta casi x=0, que es el borde
# INFERIOR de la etiqueta física (lo que el usuario vio "tocando el borde").
TEXT_SIDE_MIN_MM = 2.0  # margen mínimo garantizado del texto en ambos extremos de PORT_W
TEXT_X_SHIFT_MM = 0.8  # sesgo del texto hacia x alto = "arriba" en la etiqueta física
# Eje PORT_H (= horizontal de la etiqueta física, izquierda/derecha): en vez de
# centrar el bloque QR+texto, se ancla cerca del lado del QR (izquierda física)
# con un margen chico fijo, y el sobrante queda después del texto (derecha).
LEFT_MARGIN_MM = 0.5

PAGESIZE = f"w{int(PAGE_W_MM)}h{int(PAGE_H_MM)}"


def _px(mm: float) -> int:
    return round(mm * DPI / 25.4)


LABEL_W = _px(LABEL_W_MM)
LABEL_H = _px(LABEL_H_MM)
PAGE_W = _px(PAGE_W_MM)
PAGE_H = _px(PAGE_H_MM)
GAP_X = _px(GAP_X_MM)

# Diseño en vertical (lado menor = ancho pegado, lado mayor = alto), rotado 90°
# para imprimir sobre la etiqueta física landscape (33x25mm). Igual que
# redes_qr.py: al pegar la etiqueta rotada, el contenido se ve vertical...
# y en la etiqueta física ya rotada, el QR queda a la izquierda y el texto a
# la derecha (esto es lo que el usuario pidió explícitamente).
PORT_W = min(LABEL_W, LABEL_H)
PORT_H = max(LABEL_W, LABEL_H)

QR_SIZE = round(PORT_W * QR_RATIO)
LABEL_FONT_SIZE = max(8, round(PORT_W * FONT_RATIO))
QR_GAP = round(PORT_W * GAP_RATIO)
H_SHIFT = _px(H_SHIFT_MM)
TEXT_SIDE_MIN = _px(TEXT_SIDE_MIN_MM)
TEXT_X_SHIFT = _px(TEXT_X_SHIFT_MM)
LEFT_MARGIN = _px(LEFT_MARGIN_MM)
TEXT_MAX_W = PORT_W - 2 * TEXT_SIDE_MIN  # _fit_font nunca devuelve algo más ancho que esto

PER_PAGE = 3  # columnas por fila del rollo

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]


def _load_font(size: int = LABEL_FONT_SIZE) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def _fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, min_size: int = 6) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Nombres reales varían mucho en largo (a diferencia de los textos fijos cortos de
    atonik/redes_qr.py, ej. "WhatsApp"): busca el tamaño más grande que quepa en max_width
    para no cortar el texto (bug visto con "Alejandro Pedreros" a tamaño fijo)."""
    # Baja hasta min_size: un nombre absurdamente largo se achica antes que
    # desbordar el lienzo (con nombres reales no baja de ~17px).
    size = LABEL_FONT_SIZE
    while size >= min_size:
        font = _load_font(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_width:
            return font
        size -= 1
    return _load_font(min_size)


def short_label(name: str) -> str:
    """Primer nombre + primer apellido, para identificar el sticker a simple vista sin abrir el sistema.
    Heurística: en nombres de 4+ palabras asume "Nombre(s)... Apellido1 Apellido2" y toma la penúltima."""
    words = name.split()
    if len(words) <= 3:
        return " ".join(words[:2])
    return f"{words[0]} {words[-2]}"


def login() -> str:
    email = os.environ.get("GRADODIEGUI_EMAIL")
    password = os.environ.get("GRADODIEGUI_PASSWORD")
    if email and password:
        print(f"Usando credenciales de .env ({email})")
    else:
        email = input("Email coordinación: ").strip()
        password = getpass.getpass("Contraseña: ")
    try:
        r = requests.post(f"{API_BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"No pude conectar a la API en {API_BASE}: {e}")
    if r.status_code == 401:
        raise SystemExit("Credenciales incorrectas.")
    r.raise_for_status()
    data = r.json()
    if data["user"]["role"] != "coordinacion":
        raise SystemExit("Ese usuario no es de coordinación, no puede generar stickers.")
    return data["token"]


def resolve_course_id(course: str | None) -> str | None:
    """Acepta un ObjectId de Mongo tal cual, o un nombre de curso ("Décimo", "Once") que resuelve
    contra GET /api/courses (público, no requiere login)."""
    if course is None:
        return None
    if len(course) == 24 and all(c in "0123456789abcdef" for c in course.lower()):
        return course

    try:
        r = requests.get(f"{API_BASE}/courses", timeout=10)
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"No pude conectar a la API en {API_BASE}: {e}")
    r.raise_for_status()
    courses = r.json()

    matches = [c for c in courses if c["name"].strip().lower() == course.strip().lower()]
    if not matches:
        disponibles = ", ".join(c["name"] for c in courses)
        raise SystemExit(f"No encontré el curso '{course}'. Disponibles: {disponibles}")
    return matches[0]["id"]


def fetch_students(token: str, course_id: str | None = None) -> list[dict]:
    params = {"courseId": course_id} if course_id else {}
    try:
        r = requests.get(
            f"{API_BASE}/students/qrs",
            params=params,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
    except requests.exceptions.RequestException as e:
        raise SystemExit(f"No pude conectar a la API en {API_BASE}: {e}")
    if r.status_code == 400:
        raise SystemExit(f"courseId inválido: {course_id}")
    r.raise_for_status()
    return r.json()


def _render_label(student: dict) -> Image.Image:
    base = Image.new("L", (PORT_W, PORT_H), 255)
    d = ImageDraw.Draw(base)

    qr = qrcode.make(student["qrToken"]).convert("L").resize((QR_SIZE, QR_SIZE))
    qx = (PORT_W - QR_SIZE) // 2 + H_SHIFT

    label = short_label(student["name"])
    font = _fit_font(d, label, TEXT_MAX_W)
    asc, desc = font.getmetrics()
    text_h = asc + desc

    # Bloque QR+gap+texto anclado cerca del lado del QR (izquierda física, ver
    # LEFT_MARGIN_MM): la holgura sobrante queda después del texto (derecha
    # física) en vez de repartirse a ambos lados.
    qy = LEFT_MARGIN
    base.paste(qr, (qx, qy))

    bbox = d.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    # Eje PORT_W: centrado en el lienzo (no bajo el QR) + sesgo propio hacia x alto
    # = "arriba" en la física, con TEXT_SIDE_MIN garantizado en ambos extremos.
    lo, hi = TEXT_SIDE_MIN, PORT_W - tw - TEXT_SIDE_MIN
    tx = (PORT_W - tw) // 2 + TEXT_X_SHIFT
    tx = max(lo, min(tx, hi)) if hi >= lo else max(0, (PORT_W - tw) // 2)
    d.text((tx, qy + QR_SIZE + QR_GAP), label, fill=0, font=font)

    # Rota 90° para encajar en la etiqueta física landscape (32x27mm).
    return base.transpose(Image.ROTATE_90)


def _generar_pagina(students: list[dict]) -> Image.Image:
    sheet = Image.new("L", (PAGE_W, PAGE_H), 255)
    for i, student in enumerate(students):
        label = _render_label(student)
        sheet.paste(label, (i * (LABEL_W + GAP_X), 0))
    return sheet


def generar_paginas(students: list[dict], out_dir: str) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for i in range(0, len(students), PER_PAGE):
        img = _generar_pagina(students[i : i + PER_PAGE])
        path = os.path.join(out_dir, f"qr_page_{i // PER_PAGE + 1}.png")
        img.save(path, dpi=(DPI, DPI))
        paths.append(path)
    return paths


def verificar_impresora(printer: str = PRINTER) -> None:
    """Avisa si la impresora está deshabilitada en CUPS antes de encolar nada
    (si no, `lp` acepta el trabajo pero no sale nada, sin ningún error)."""
    try:
        r = subprocess.run(["lpstat", "-p", printer], capture_output=True, text=True)
    except FileNotFoundError:
        print("  AVISO: no encontré el comando 'lpstat' (¿CUPS instalado?). Sigo de todas formas.")
        return
    if r.returncode != 0:
        print(f"  AVISO: la impresora '{printer}' no existe en CUPS todavía (¿ya la agregaste?).")
        return
    if "disabled" in r.stdout.lower():
        print(f"  AVISO: la impresora '{printer}' está deshabilitada/desconectada.")
        print(f"  Conéctala y corre 'cupsenable {printer}' antes de imprimir, o los trabajos se van a encolar sin salir nada.")


def imprimir(paths: list[str], printer: str = PRINTER) -> None:
    verificar_impresora(printer)
    for i, p in enumerate(paths, 1):
        try:
            # -o PageSize explícito: sin esto la SAT estira la imagen y el
            # sticker sale regado en 2-3 etiquetas (bug de escalado, ver docstring).
            subprocess.run(["lp", "-d", printer, "-o", f"PageSize={PAGESIZE}", p], check=True)
            print(f"  enviada a la impresora {i}/{len(paths)}: {os.path.basename(p)}")
        except FileNotFoundError:
            raise SystemExit("No encontré el comando 'lp' en esta máquina (¿CUPS instalado?).")
        except subprocess.CalledProcessError as e:
            print(f"  ERROR lp: {e}")
