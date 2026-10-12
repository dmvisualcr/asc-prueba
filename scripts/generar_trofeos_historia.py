#!/usr/bin/env python3
"""
Genera la lista de "Trofeos en la Historia del Herediano" (Multimedia) a partir de las imágenes.

USO (desde la carpeta del proyecto):
    python scripts/generar_trofeos_historia.py
    python scripts/generar_trofeos_historia.py  otra/carpeta        (si las imágenes están en otro lugar)

DÓNDE BUSCA LAS IMÁGENES (en este orden):
    1) asociados/trofeos/     <- RECOMENDADO: solo se entregan a quien tenga sesión abierta
    2) trofeos/100/           <- carpeta pública del sitio (cualquiera con el enlace podría verlas)

CÓMO DEBEN LLAMARSE LAS IMÁGENES  (AÑO - NOMBRE.webp):
    1912 - BELISARIO PORRAS.webp
    1921 - CN.webp                      "CN" se muestra como "Campeonato Nacional"
    2000 2001 SUB CAMPEON.webp          dos años -> "2000-2001";  "SUB CAMPEON" -> "Subcampeón"
    2004 - CN CLAUSURA.webp
  Los títulos se arreglan solos (mayúsculas -> "Formato Título", tildes comunes). Si quieres corregir uno a mano,
  edita asociados/data/trofeos-historia.json: al volver a correr el programa tus correcciones se respetan.

Escribe  asociados/data/trofeos-historia.json . Es seguro correrlo las veces que quieras.
"""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "asociados" / "data" / "trofeos-historia.json"
BUSCAR_EN = [RAIZ / "asociados" / "trofeos", RAIZ / "trofeos" / "100"]
EXTENSIONES = {".webp", ".png", ".jpg", ".jpeg", ".svg", ".avif"}
MINUSCULAS = {"de", "del", "la", "las", "los", "el", "al", "y", "por", "en", "a"}
SIGLAS = {"CONCACAF", "UNCAF", "FIFA", "CSH"}
# Palabras que en los nombres de archivo suelen venir sin tilde
ACENTOS = {
    "mexico": "México", "seleccion": "Selección", "haiti": "Haití", "aguila": "Águila", "velez": "Vélez",
    "atletico": "Atlético", "civicas": "Cívicas", "gonzalez": "González", "campeon": "Campeón",
    "cartagines": "Cartaginés", "americas": "Américas", "angeles": "Ángeles", "panama": "Panamá",
    "union": "Unión", "colon": "Colón", "cristobal": "Cristóbal", "bicentenario": "Bicentenario",
}


def sin_tildes(t):
    return "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")


def bonito(texto):
    texto = " ".join(texto.split())
    if any(c.islower() for c in texto):
        return texto[:1].upper() + texto[1:]
    palabras = []
    for i, p in enumerate(texto.split(" ")):
        clave = sin_tildes(p).lower()
        if p in SIGLAS:
            palabras.append(p)
        elif i > 0 and clave in MINUSCULAS:
            palabras.append(clave)
        elif len(p) == 1 and p.isalpha():
            palabras.append(p)  # "U" de "U de Chile", "F"/"M" al final
        elif clave in ACENTOS:
            palabras.append(ACENTOS[clave])
        else:
            palabras.append(p.capitalize())
    return " ".join(palabras)


def analizar(nombre):
    """nombre sin extensión -> (anio, etiqueta, titulo, categoria) o None."""
    m = re.match(r"^(\d{4})(?:\s*[-–/]\s*|\s+)(\d{4})?\s*[-–]?\s*(.*)$", nombre.strip())
    if not m:
        return None
    anio, anio2, resto = int(m.group(1)), m.group(2), m.group(3).strip()
    etiqueta = f"{m.group(1)}-{anio2}" if anio2 else m.group(1)
    clave = re.sub(r"\s+", " ", sin_tildes(resto).upper()).strip()

    if clave == "CN":
        titulo, categoria = "Campeonato Nacional", "Campeonato Nacional"
    elif clave.startswith("CN "):
        titulo, categoria = "Campeonato Nacional · " + bonito(resto[3:]), "Campeonato Nacional"
    elif "SUB CAMPEON" in clave:
        titulo = "Subcampeón" + (" · " + bonito(re.sub(r"(?i)sub\s*campe[oó]n", "", resto).strip()) if re.sub(r"(?i)sub\s*campe[oó]n", "", resto).strip() else "")
        categoria = "Subcampeonato"
    elif clave.startswith("CAMPEONATO NACIONAL"):
        titulo, categoria = bonito(resto), "Campeonato Nacional"
    else:
        titulo, categoria = bonito(resto) or "Trofeo", "Copas y torneos"
    return anio, etiqueta, titulo, categoria


def carpeta_de_imagenes():
    if len(sys.argv) > 1:
        c = Path(sys.argv[1]).resolve()
        return c if c.is_dir() else sys.exit(f"No existe la carpeta: {c}")
    for c in BUSCAR_EN:
        if c.is_dir() and any(f.suffix.lower() in EXTENSIONES for f in c.iterdir() if f.is_file()):
            return c
    sys.exit("No encontré imágenes. Pon los archivos en asociados/trofeos/ (recomendado) o en trofeos/100/,\n"
             "o indica la carpeta:  python scripts/generar_trofeos_historia.py  ruta/de/la/carpeta")


def main():
    carpeta = carpeta_de_imagenes()
    print(f"Leyendo imágenes de: {carpeta}")
    try:
        previos = {t["src"]: t for t in json.loads(SALIDA.read_text(encoding="utf-8")).get("trofeos", [])}
    except (OSError, ValueError):
        previos = {}

    base = RAIZ / "asociados"
    resultado, ignorados = [], []
    for f in sorted(carpeta.iterdir(), key=lambda p: p.name.lower()):
        if not f.is_file() or f.suffix.lower() not in EXTENSIONES:
            continue
        src = Path(os.path.relpath(f, base)).as_posix()  # ruta desde /asociados/, ej.: "trofeos/..." o "../trofeos/100/..."
        if src in previos:
            resultado.append(previos[src])
            continue
        datos = analizar(f.stem)
        if not datos:
            ignorados.append(f.name)
            continue
        anio, etiqueta, titulo, categoria = datos
        resultado.append({"anio": anio, "etiqueta": etiqueta, "titulo": titulo, "categoria": categoria, "src": src})

    if not resultado:
        sys.exit("No se pudo leer ninguna imagen (los nombres deben empezar con el año).")
    resultado.sort(key=lambda t: (t["anio"], t["src"].lower()))
    texto = json.dumps({"trofeos": resultado}, ensure_ascii=False, indent=2) + "\n"
    if not SALIDA.exists() or SALIDA.read_text(encoding="utf-8") != texto:
        SALIDA.parent.mkdir(parents=True, exist_ok=True)
        SALIDA.write_text(texto, encoding="utf-8")
    conteo = {}
    for t in resultado:
        conteo[t["categoria"]] = conteo.get(t["categoria"], 0) + 1
    print(f"Listo: {len(resultado)} trofeos ({', '.join(f'{k}: {v}' for k, v in sorted(conteo.items()))}).")
    for nombre in ignorados:
        print(f"AVISO: no se entendió el nombre '{nombre}' (debe empezar con el año). No se agregó.")


if __name__ == "__main__":
    main()
