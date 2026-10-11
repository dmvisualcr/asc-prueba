# Zona de asociados — secciones internas

Todo lo que está dentro de `/asociados/` solo se entrega a quien tenga sesión abierta
(lo decide el servidor, no el navegador). Las páginas del sitio público no cambian.

## Qué trae
| Página | Qué es |
|---|---|
| `asociados/index.html` | Inicio: accesos a cada sección + datos del asociado + renovar por WhatsApp |
| `asociados/beneficios.html` | Beneficios, comercios aliados y boletín de convenios (PDF) |
| `asociados/multimedia.html` | Álbumes de fotos, archivo fotográfico, cápsulas históricas y expresidentes |
| `asociados/album.html` | Un álbum: cuadrícula de fotos y visor a pantalla completa |
| `asociados/documentos.html` | Documentos con buscador y categorías |
| `asociados/buzon.html` | Buzón de ideas (formulario de Google) |
| `asociados/nosotros.html` | Junta Directiva, contacto con la Fiscalía (botón de WhatsApp), misión, visión y valores |

El menú de esta zona es propio (Inicio · Beneficios · Multimedia · Documentos · Buzón · Nosotros ·
Cerrar sesión). El menú del sitio público queda solo para la parte pública. Desde el pie de página se vuelve al sitio público.

## Cómo publicar un documento
1. Copia el PDF a la carpeta `asociados/docs/` (créala si no existe). Los informes de la Fiscalía van aquí también, en la categoría "Informes de Fiscalía".
   Usa nombres sin tildes ni espacios si puedes: `acta-asamblea-2026.pdf`.
2. Abre `asociados/data/documentos.json` y agrega un bloque dentro de la categoría que corresponda:

```json
{ "titulo": "Acta de Asamblea Ordinaria 2026",
  "fecha": "2026-03-15",
  "archivo": "docs/acta-asamblea-2026.pdf",
  "descripcion": "Asamblea anual" }
```
   - Los bloques se separan con coma. `fecha` va como AAAA-MM-DD. `descripcion` es opcional.
   - Dentro de cada categoría se ordenan solos, del más reciente al más antiguo.
   - Categorías vacías no se muestran. Para crear una nueva, copia una categoría completa y cambia el nombre.
3. Sube los cambios. Si algo no aparece, revisa que no falte ninguna coma o comilla en el JSON.

## Álbumes de fotos (Multimedia)
**Dónde van las fotos:** dentro de `asociados/albumes/`, una carpeta por álbum. El nombre de la carpeta es el título:
```
asociados/albumes/
  01 - Demolición Estadio Eladio Rosabal Cordero/   foto001.webp, foto002.webp …
  02 - Acto - Primera Piedra/
  03 - Días del Asociado/
  ...
```
- El número y el guion del inicio ("01 - ") solo ordenan los álbumes y no se muestran. Sin número, se ordenan por nombre.
- Opcional: `portada.webp` dentro de la carpeta = portada del álbum. `descripcion.txt` = texto bajo el título.
- Las fotos se ordenan por nombre de archivo (`foto2` va antes que `foto10`). Si quieres un orden especial, nómbralas `001`, `002`…

**Cada vez que agregues o cambies fotos:**
1. Una sola vez: `python -m pip install pillow` (para crear miniaturas ligeras; sin eso igual funciona, pero carga más lento).
2. En el terminal del proyecto: `python scripts/generar_albumes.py`. Crea las miniaturas y las listas de cada álbum.
3. Sube todo (GitHub Desktop → commit → push). **No uses la subida por navegador de GitHub para muchas fotos**: solo deja 100 archivos a la vez.

**Límites a tener presentes:** Cloudflare Pages acepta hasta 20.000 archivos por sitio (las miniaturas cuentan: cada foto son 2 archivos)
y 25 MB por archivo. Si llegas a unas 8.000 fotos, o si el repositorio pasa de ~1 GB, hay que mover las fotos a Cloudflare R2 (se puede, avísame).

**Importante:** extrae el zip ANTES de correr el programa; si lo extraes después, `asociados/data/albumes.json` vuelve a quedar vacío (se arregla corriendo el programa de nuevo).

## WhatsApp de la Fiscalía
En `asociados/nosotros.html`, busca (Ctrl + F) `50622618489`. Por ahora es el WhatsApp de la asociación.
Cuando tengas el número real, reemplázalo ahí (código de país + número, sin `+` ni espacios; ejemplo: `50688887777`).

## Si venías de la versión anterior
Ya no existe la página de Fiscalía. **Borra** estos dos archivos de tu proyecto:
- `asociados/fiscalia.html`
- `asociados/data/fiscalia.json`

Y si ya habías agregado documentos en `asociados/data/documentos.json`, **no reemplaces ese archivo**: solo agrega esta categoría
dentro de la lista `"categorias"` (entre las demás, separada por coma):
```json
{ "nombre": "Informes de Fiscalía", "descripcion": "Informes que publica la Fiscalía de la asociación.", "documentos": [] }
```

## Agregar o quitar una opción del menú
El menú está escrito en cada página (son 7 archivos). En VS Code: **Ctrl + Shift + H** (buscar y reemplazar en todos los archivos).

## Importante: privacidad del repositorio
Si tu repositorio de GitHub es **público**, cualquiera puede ver ahí los PDF de `asociados/docs/`, el enlace del
formulario del buzón y las listas `asociados/data/*.json`, aunque el sitio los proteja.
**Haz el repositorio privado antes de subir documentos de verdad** (Cloudflare Pages funciona igual con repositorios privados):
GitHub → tu repositorio → Settings → General → Danger Zone → Change visibility.

## Cosas a saber
- `nosotros.html` de esta zona es una copia del público: si cambias la Junta Directiva en uno, cámbiala también en el otro.
- En Multimedia no está el carrusel "Momentos de gloria": ahora es público y más completo, en la página Equipo.
- Falta por construir: avisos y eventos.
- Las fotos y PDF se guardan 1 hora en el navegador de cada persona (para que los álbumes carguen rápido); las páginas y listas, nunca.
