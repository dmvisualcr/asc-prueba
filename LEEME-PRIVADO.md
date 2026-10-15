# Zona de asociados — secciones internas

Todo lo que está dentro de `/asociados/` solo se entrega a quien tenga sesión abierta
(lo decide el servidor, no el navegador). Las páginas del sitio público no cambian.

## Qué trae
| Página | Qué es |
|---|---|
| `asociados/index.html` | Inicio: accesos a cada sección + datos del asociado + renovar por WhatsApp |
| `asociados/beneficios.html` | Beneficios, comercios aliados y boletín de convenios (PDF) |
| `asociados/multimedia.html` | Álbumes de fotos, archivo fotográfico, cápsulas históricas y expresidentes |
| (dentro de Multimedia) | "Trofeos en la Historia del Herediano": una fila con los más recientes y botón "Ver todos los trofeos" |
| `asociados/trofeos.html` | Los 101 trofeos, con buscador, filtros por tipo y visor |
| (dentro de Multimedia) | "En busca de Julio Gómez en el Centenario Herediano": foto, historia y enlaces |
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

## Trofeos en la Historia del Herediano (Multimedia)
**Dónde van las imágenes:** en `asociados/trofeos/` (recomendado: solo se entregan a quien tenga sesión abierta).
Si las dejas en `trofeos/100/` también funciona, pero esa carpeta es pública: cualquiera con el enlace de una imagen podría verla.

**Cómo deben llamarse** (`AÑO - NOMBRE.webp`):
```
1912 - BELISARIO PORRAS.webp
1921 - CN.webp                    "CN" se muestra como "Campeonato Nacional"
2000 2001 SUB CAMPEON.webp        dos años -> "2000-2001";  "SUB CAMPEON" -> "Subcampeón"
2004 - CN CLAUSURA.webp
```
Cada trofeo se clasifica solo en uno de tres tipos: **Campeonato Nacional** (CN, CN CLAUSURA, CAMPEONATO NACIONAL…),
**Subcampeonato** (SUB CAMPEON) y **Copas y torneos** (todo lo demás).

**Cada vez que agregues o cambies imágenes:**
1. En el terminal del proyecto: `python scripts/generar_trofeos_historia.py` (indica qué carpeta leyó y cuántos trofeos encontró).
2. Sube todo con GitHub Desktop (commit y push).

**Corregir un título a mano:** abre `asociados/data/trofeos-historia.json`, cambia el texto de `"titulo"` (o `"categoria"`) y guarda.
Al volver a correr el programa tus correcciones se respetan. Si un nombre de archivo no empieza con el año, el programa lo avisa y no lo agrega.

## En busca de Julio Gómez (Multimedia)
Va entre las cápsulas históricas y los expresidentes. La foto es `IMG/Julio_Gomez.jpg`.
Para cambiar el texto o los enlaces, abre `asociados/multimedia.html` y busca (Ctrl + F) `julio-gomez`.
- Cada enlace es una línea `<li>…</li>`. El nombre que se muestra va dentro de `<strong>` (arriba) y `<small>` (abajo).
- Para agregar un enlace, copia una línea `<li>…</li>` completa y cambia el `href` y los textos.
- Los íconos: `fab fa-facebook-f` (Facebook), `fab fa-youtube` (YouTube), `fas fa-newspaper` (nota de prensa).

## Trofeos: fila corta y página completa
En Multimedia se ve una sola fila con los trofeos más **recientes** (tantos como caben: 6 en computadora, 2 en celular).
El botón "Ver todos los trofeos" abre `trofeos.html` con los 101. Para mostrar otros trofeos en la fila, o cuántos,
hay que cambiar `data-max="8"` en `multimedia.html` (cantidad máxima) o pedirme otro criterio de orden.

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
