#!/usr/bin/env python3
"""
Actualiza data/noticias-club.json con las noticias de https://www.herediano.com/noticias

Lo ejecuta GitHub Actions cada hora (ver .github/workflows/actualizar-noticias.yml).
Solo usa la biblioteca estándar de Python: no hay nada que instalar.

Cómo funciona:
  1. Lee la página de noticias del club y saca los enlaces a cada nota y su categoría.
  2. Para cada nota NUEVA abre la página de la nota y toma título, fecha, foto y resumen.
     Las notas que ya estaban en el archivo no se vuelven a descargar.
  3. Guarda el resultado ordenado de la más reciente a la más antigua.

Si el sitio del club no responde, el archivo actual se conserva tal cual.
"""
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

BASE = "https://www.herediano.com"
LISTA = BASE + "/noticias"
SALIDA = Path(__file__).resolve().parent.parent / "data" / "noticias-club.json"
MAX_NOTAS = 30
# Las más largas primero, para que "Noticias" (la más genérica) se pruebe al final
CATEGORIAS = ["Comunicados", "Refuerzos", "Crónicas", "Entradas", "Femenino", "Cantera", "Noticias"]
COSTA_RICA = timezone(timedelta(hours=-6))  # Costa Rica no cambia de hora en el año
USER_AGENT = "Mozilla/5.0 (compatible; AsociacionCSH-Noticias/1.0; +https://ascherediano.com)"


# ---------------------------------------------------------------- descarga
def descargar(url, intentos=3):
    ultimo_error = None
    for i in range(intentos):
        try:
            req = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "es-CR,es;q=0.9"})
            with urlopen(req, timeout=25) as r:
                charset = r.headers.get_content_charset() or "utf-8"
                return r.read().decode(charset, errors="replace")
        except Exception as e:  # noqa: BLE001 - se reintenta con cualquier error de red
            ultimo_error = e
            time.sleep(2 * (i + 1))
    raise ultimo_error


# ---------------------------------------------------------------- listado
def detectar_categoria(textos):
    for t in textos:
        if t in CATEGORIAS:
            return t
    unido = " ".join(textos)
    for c in CATEGORIAS:
        if unido.startswith(c):
            return c
    return None


class ListadoParser(HTMLParser):
    PATRON = re.compile(r"^(?:https?://(?:www\.)?herediano\.com)?/noticias/([A-Za-z0-9_\-%]+)/?$")

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.notas = {}   # url -> {"categoria": ...}
        self.orden = []   # urls en el orden en que aparecen
        self._actual = None

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        m = self.PATRON.match((dict(attrs).get("href") or "").strip())
        if m:
            self._actual = {"url": f"{BASE}/noticias/{m.group(1)}", "textos": []}

    def handle_data(self, data):
        if self._actual is not None:
            t = " ".join(data.split())
            if t:
                self._actual["textos"].append(t)

    def handle_endtag(self, tag):
        if tag != "a" or self._actual is None:
            return
        a, self._actual = self._actual, None
        cat = detectar_categoria(a["textos"])
        if a["url"] not in self.notas:
            self.notas[a["url"]] = {"categoria": cat}
            self.orden.append(a["url"])
        elif cat and not self.notas[a["url"]]["categoria"]:
            self.notas[a["url"]]["categoria"] = cat


# ---------------------------------------------------------------- nota
class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.title = ""
        self._en_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            d = dict(attrs)
            clave = d.get("property") or d.get("name")
            valor = d.get("content")
            if clave and valor is not None and clave not in self.meta:
                self.meta[clave] = valor.strip()
        elif tag == "title":
            self._en_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._en_title = False

    def handle_data(self, data):
        if self._en_title:
            self.title += data


def a_hora_costa_rica(texto):
    try:
        dt = datetime.fromisoformat(texto.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(COSTA_RICA)


def parse_articulo(html, url, categoria):
    p = MetaParser()
    p.feed(html)
    m = p.meta
    titulo = (m.get("og:title") or p.title.split(" · ")[0]).strip()
    if not titulo:
        return None
    dt = a_hora_costa_rica(m.get("article:published_time", "")) or datetime.now(COSTA_RICA)
    return {
        "titulo": titulo,
        "fecha": dt.strftime("%Y-%m-%d"),
        "fecha_hora": dt.isoformat(timespec="seconds"),
        "imagen": m.get("og:image") or m.get("twitter:image") or "",
        "resumen": m.get("og:description") or m.get("description") or "",
        "categoria": categoria or "Noticias",
        "fuente": "herediano.com",
        "url": url,
    }


# ---------------------------------------------------------------- principal
def leer_previas():
    try:
        datos = json.loads(SALIDA.read_text(encoding="utf-8"))
        return {n["url"]: n for n in datos.get("noticias", []) if n.get("url")}
    except (OSError, ValueError):
        return {}


def main():
    try:
        html = descargar(LISTA)
    except Exception as e:  # noqa: BLE001
        print(f"No se pudo leer {LISTA}: {e}. Se conserva el archivo actual.")
        return 0

    listado = ListadoParser()
    listado.feed(html)
    if not listado.orden:
        print("ERROR: no se encontró ninguna nota en la página. ¿Cambió el diseño del sitio del club? "
              "Se conserva el archivo actual.")
        return 1

    previas = leer_previas()
    resultado = []
    for url in listado.orden[:MAX_NOTAS]:
        categoria = listado.notas[url]["categoria"]
        if url in previas:
            nota = dict(previas[url])
            if categoria:
                nota["categoria"] = categoria
            resultado.append(nota)
            continue
        try:
            nota = parse_articulo(descargar(url), url, categoria)
        except Exception as e:  # noqa: BLE001
            print(f"No se pudo leer la nota {url}: {e}")
            continue
        if nota:
            resultado.append(nota)
        time.sleep(0.4)  # sin saturar el sitio del club

    if not resultado:
        print("No se pudo leer ninguna nota. Se conserva el archivo actual.")
        return 0

    resultado.sort(key=lambda n: n["fecha_hora"], reverse=True)
    contenido = json.dumps({"noticias": resultado}, ensure_ascii=False, indent=2) + "\n"
    actual = SALIDA.read_text(encoding="utf-8") if SALIDA.exists() else ""
    if contenido != actual:
        SALIDA.parent.mkdir(parents=True, exist_ok=True)
        SALIDA.write_text(contenido, encoding="utf-8")
        print(f"Actualizado: {len(resultado)} noticias.")
    else:
        print("Sin cambios.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
