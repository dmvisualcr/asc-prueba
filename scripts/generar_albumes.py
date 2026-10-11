#!/usr/bin/env python3
"""
Genera los álbumes de Multimedia a partir de las carpetas de fotos.

USO (desde la carpeta del proyecto):
    python scripts/generar_albumes.py

CÓMO FUNCIONA
  Cada carpeta dentro de  asociados/albumes/  es un álbum. El nombre de la carpeta es el título:

      asociados/albumes/Demolición Estadio Eladio Rosabal Cordero/foto001.webp
      asociados/albumes/Acto - Primera Piedra/foto001.webp
      ...

  Opcional:
    - Para ordenar los álbumes, empieza el nombre con número y guion:  "01 - Demolición…", "02 - Acto…".
      El número NO se muestra en el título. (Sin número, se ordenan por nombre.)
    - Una foto llamada  portada.webp  (o portada.jpg…) se usa como portada. Si no existe, la primera foto.
    - Un archivo  descripcion.txt  dentro de la carpeta: su texto aparece debajo del título del álbum.
    - Las fotos se ordenan por nombre de archivo (foto2 antes que foto10).

  El programa crea miniaturas ligeras (carpeta _mini dentro de cada álbum) para que las páginas carguen rápido,
  y escribe  asociados/data/albumes.json  y  asociados/data/albumes/<álbum>.json.
  Las miniaturas necesitan la herramienta Pillow:   python -m pip install pillow
  (si no está instalada, igual funciona, pero las páginas cargarán más lento).

  Es seguro correrlo las veces que quieras: solo crea lo que falta.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "asociados" / "albumes"
DATOS = RAIZ / "asociados" / "data"
EXTENSIONES = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif"}
LADO_MINIATURA = 520
PORTADAS = {"portada", "cover"}

try:
    from PIL import Image, ImageOps
except ImportError:  # sin Pillow no hay miniaturas
    Image = None


def natural(texto):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", texto)]


def slug(texto):
    t = unicodedata.normalize("NFD", texto)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "album"


def titulo_y_orden(nombre):
    m = re.match(r"^\s*(\d{1,3})\s*[-._)]\s*(.+)$", nombre)
    return (int(m.group(1)), m.group(2).strip()) if m else (999, nombre.strip())


def crear_miniatura(origen, destino):
    """True si la miniatura existe (nueva o ya hecha)."""
    if Image is None or origen.suffix.lower() == ".gif":
        return False
    if destino.exists() and destino.stat().st_mtime >= origen.stat().st_mtime:
        return True
    try:
        with Image.open(origen) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((LADO_MINIATURA, LADO_MINIATURA))
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            destino.parent.mkdir(exist_ok=True)
            im.save(destino, "WEBP", quality=72, method=4)
        return True
    except Exception as e:  # noqa: BLE001 - una foto dañada no debe frenar todo
        print(f"   AVISO: no se pudo hacer la miniatura de {origen.name}: {e}")
        return False


def escribir_json(ruta, datos):
    texto = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"
    if not ruta.exists() or ruta.read_text(encoding="utf-8") != texto:
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_text(texto, encoding="utf-8")


def main():
    if not CARPETA.exists():
        sys.exit(f"No existe la carpeta {CARPETA}. Créala y pon adentro una carpeta por álbum.")
    if Image is None:
        print("AVISO: Pillow no está instalado, no se crearán miniaturas.\n"
              "       Instálalo con:  python -m pip install pillow\n")

    albumes, usados = [], set()
    carpetas = [c for c in CARPETA.iterdir() if c.is_dir() and not c.name.startswith(("_", "."))]
    carpetas.sort(key=lambda c: (titulo_y_orden(c.name)[0], natural(titulo_y_orden(c.name)[1])))

    for carpeta in carpetas:
        orden, titulo = titulo_y_orden(carpeta.name)
        archivos = sorted((f for f in carpeta.iterdir() if f.is_file() and f.suffix.lower() in EXTENSIONES),
                          key=lambda f: natural(f.name))
        if not archivos:
            print(f"- {titulo}: sin fotos, se omite")
            continue

        base = slug(titulo)
        album_id, n = base, 2
        while album_id in usados:
            album_id, n = f"{base}-{n}", n + 1
        usados.add(album_id)

        fotos, portada = [], None
        for f in archivos:
            mini = carpeta / "_mini" / (f.stem + ".webp")
            hay_mini = crear_miniatura(f, mini)
            rel = f.relative_to(RAIZ / "asociados").as_posix()
            rel_mini = mini.relative_to(RAIZ / "asociados").as_posix() if hay_mini else rel
            if f.stem.lower() in PORTADAS:
                portada = rel_mini  # la portada no se repite dentro del álbum
                continue
            fotos.append({"src": rel, "mini": rel_mini})
        if not fotos and portada is None:
            continue
        if portada is None:
            portada = fotos[0]["mini"]

        descripcion = ""
        desc = carpeta / "descripcion.txt"
        if desc.exists():
            descripcion = " ".join(desc.read_text(encoding="utf-8").split())

        escribir_json(DATOS / "albumes" / f"{album_id}.json",
                      {"id": album_id, "titulo": titulo, "descripcion": descripcion, "fotos": fotos})
        albumes.append({"id": album_id, "titulo": titulo, "descripcion": descripcion, "portada": portada, "cantidad": len(fotos)})
        print(f"✔ {titulo}: {len(fotos)} fotos")

    # Quitar los archivos de álbumes que ya no existen
    for viejo in (DATOS / "albumes").glob("*.json"):
        if viejo.stem not in usados:
            viejo.unlink()
    escribir_json(DATOS / "albumes.json", {"albumes": albumes})
    print(f"\nListo: {len(albumes)} álbumes, {sum(a['cantidad'] for a in albumes)} fotos.")


if __name__ == "__main__":
    main()
