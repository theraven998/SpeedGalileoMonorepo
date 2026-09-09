#!/usr/bin/env python3
"""Genera los personajes (Gali/Galileo y Diego) con kie.ai — google/nano-banana-edit.

Uso:  python3 gen_kie.py [nombre ...]     (sin args: los tres)
La clave sale de CarrouselerIA/.env (KIE_API_KEY).
"""
from __future__ import annotations
import base64, json, os, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

AQUI = Path(__file__).resolve().parent
REF = AQUI / "ref"
SALIDA = AQUI / "personajes"
ENV = Path("/home/raven/Proyects/CarrouselerIA/.env")

KIE = "https://api.kie.ai"
KIE_UP = "https://kieai.redpandaai.co"
MODELO = "google/nano-banana-edit"


def key() -> str:
    for linea in ENV.read_text().splitlines():
        if linea.startswith("KIE_API_KEY="):
            return linea.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("no hay KIE_API_KEY")


K = key()
H = {"Authorization": f"Bearer {K}", "Content-Type": "application/json"}
_cache: dict[str, str] = {}


def subir(p: Path) -> str:
    if p.name in _cache:
        return _cache[p.name]
    mime = "image/png" if p.suffix.lower() == ".png" else "image/jpeg"
    b64 = base64.b64encode(p.read_bytes()).decode()
    r = requests.post(f"{KIE_UP}/api/file-base64-upload", headers=H, timeout=180,
                      json={"base64Data": f"data:{mime};base64,{b64}",
                            "uploadPath": "speedgalileo", "fileName": p.name})
    r.raise_for_status()
    url = ((r.json().get("data") or {}).get("downloadUrl") or "").strip()
    if not url:
        raise SystemExit(f"sin downloadUrl: {r.text[:200]}")
    _cache[p.name] = url
    return url


def generar(nombre: str, prompt: str, refs: list[str], ratio: str) -> Path:
    urls = [subir(REF / f) for f in refs]
    r = requests.post(f"{KIE}/api/v1/jobs/createTask", headers=H, timeout=120,
                      json={"model": MODELO,
                            "input": {"prompt": prompt, "image_urls": urls,
                                      "image_size": ratio, "output_format": "png"}})
    r.raise_for_status()
    task = (r.json().get("data") or {}).get("taskId")
    if not task:
        raise SystemExit(f"sin taskId: {r.text[:300]}")
    print(f"[{nombre}] task {task}", flush=True)

    limite = time.time() + 480
    while time.time() < limite:
        time.sleep(6)
        s = requests.get(f"{KIE}/api/v1/jobs/recordInfo", headers=H,
                         params={"taskId": task}, timeout=60)
        s.raise_for_status()
        d = s.json().get("data") or {}
        estado = (d.get("state") or "").lower()
        if estado == "success":
            res = d.get("resultJson") or "{}"
            if isinstance(res, str):
                res = json.loads(res)
            u = (res.get("resultUrls") or [None])[0]
            if not u:
                raise SystemExit(f"[{nombre}] sin imagen: {d}")
            SALIDA.mkdir(parents=True, exist_ok=True)
            destino = SALIDA / f"{nombre}.png"
            destino.write_bytes(requests.get(u, timeout=240).content)
            print(f"[{nombre}] OK -> {destino}", flush=True)
            return destino
        if estado in ("fail", "failed", "error"):
            raise SystemExit(f"[{nombre}] fallo: {d.get('failMsg') or d}")
    raise SystemExit(f"[{nombre}] timeout")


# ── estilo común ──────────────────────────────────────────────────────────────
ESTILO = (
    "Flat vector cartoon mascot illustration, exactly in the visual style of the Duolingo "
    "app characters: chunky rounded shapes, clean flat colors with soft subtle shading, no "
    "black outlines, oversized friendly eyes with big white sclera and round dark pupils, "
    "simple rounded mitten hands, warm cheerful expression, slightly oversized head (about "
    "one third of the body height), short simple legs, full body from head to feet, feet "
    "fully visible, standing, front view, centered, plain solid pure white background "
    "(#FFFFFF), no shadows on the background, no text, no logos, no watermark, no border. "
    "CRITICAL: absolutely no black or dark outlines, no line art, no contour strokes around "
    "any shape; every form is defined only by flat color fills and soft internal shading, "
    "exactly like the last reference image, which is the style guide to match precisely."
)
UNIFORME = (
    "the exact school tracksuit from the reference photos: navy blue zip-up track jacket with "
    "bright green trim on the collar and cuffs, a small green and white school crest embroidered "
    "on the left chest, matching navy blue track pants with one bright green vertical stripe down "
    "the outer side of each leg, white sneakers"
)
DIEGO = (
    "a cheerful teenage BOY, 17 years old, Colombian, clearly and unmistakably male, cartoon "
    "version of the exact boy in the reference photos. HAIR (critical, must match exactly): a "
    "modern jet-black MULLET with a HIGH SKIN FADE — the sides and back of the head are clipped "
    "extremely short right down to the skin above the ears, so BOTH EARS ARE FULLY EXPOSED and no "
    "hair whatsoever hangs down beside his face or over his cheeks; on top the hair stays thick "
    "and messy black with a choppy textured fringe falling onto his forehead, and a single small "
    "narrow tail of longer hair sits only at the very center of the nape behind the neck. Never a "
    "bob, never a page-boy cut, never hair framing the face. FACE: masculine boyish face, tan "
    "skin, defined square jawline, thicker neck, thick straight dark eyebrows, plain round dark "
    "brown eyes with no eyelashes and no makeup, small nose, wide happy open smile. PIERCINGS "
    "(must be visible): a small silver barbell piercing through his left eyebrow, and a small "
    "gold hoop earring in his exposed earlobe"
)
GALILEO = (
    "a friendly cartoon Galileo Galilei: elderly, bald on top with fluffy white hair on the sides, "
    "a big soft white beard and moustache, kind smiling eyes, small white renaissance ruff collar "
    "worn over the tracksuit jacket, holding a golden brass telescope"
)

TRABAJOS = {
    "duo": (
        f"{ESTILO} Two characters standing side by side as lifelong best friends, same art style "
        f"and same proportions, both wearing {UNIFORME}. On the left, {GALILEO}; his free arm rests "
        f"warmly over the shoulder of the boy beside him. On the right, {DIEGO}; he waves hello with "
        "his raised hand. Both look straight at the viewer, happy and welcoming.",
        ["diego-mullet.jpg", "diego-frente.jpg", "uniforme-cuerpo.jpg", "estilo-galileo.png"], "1:1"),
    "galileo": (
        f"{ESTILO} A single character: {GALILEO}, wearing {UNIFORME}. He stands relaxed, waving "
        "hello with one hand and holding the telescope in the other.",
        ["uniforme-cuerpo.jpg", "uniforme-escudo.jpg"], "3:4"),
    "diego": (
        f"{ESTILO} A single character: {DIEGO}, wearing {UNIFORME}. He stands relaxed, giving a "
        "friendly thumbs up with one hand and holding a small white card with a black QR code in "
        "the other hand.",
        ["diego-mullet.jpg", "diego-frente.jpg", "uniforme-cuerpo.jpg", "estilo-galileo.png"], "3:4"),
}

if __name__ == "__main__":
    pedidos = sys.argv[1:] or list(TRABAJOS)
    for n in pedidos:
        if n not in TRABAJOS:
            raise SystemExit(f"desconocido: {n} (hay: {', '.join(TRABAJOS)})")
    # subida secuencial primero, para no duplicar archivos en paralelo
    for n in pedidos:
        for f in TRABAJOS[n][1]:
            subir(REF / f)
    with ThreadPoolExecutor(max_workers=3) as ex:
        list(ex.map(lambda n: generar(n, *TRABAJOS[n]), pedidos))
