# Zona de asociados — secciones internas

Todo lo que está dentro de `/asociados/` solo se entrega a quien tenga sesión abierta
(lo decide el servidor, no el navegador). Las páginas del sitio público no cambian.

## Qué trae
| Página | Qué es |
|---|---|
| `asociados/index.html` | Inicio: accesos a cada sección + datos del asociado + renovar por WhatsApp |
| `asociados/beneficios.html` | Beneficios, comercios aliados y boletín de convenios (PDF) |
| `asociados/multimedia.html` | Archivo fotográfico, cápsulas históricas y expresidentes |
| `asociados/documentos.html` | Documentos con buscador y categorías |
| `asociados/fiscalia.html` | Integrantes de la Fiscalía + sus informes |
| `asociados/buzon.html` | Buzón de ideas (formulario de Google) |
| `asociados/nosotros.html` | Junta Directiva, misión, visión y valores |

El menú de esta zona es propio (Inicio · Beneficios · Multimedia · Documentos · Fiscalía · Buzón · Nosotros ·
Cerrar sesión). El menú del sitio público queda solo para la parte pública. Desde el pie de página se vuelve al sitio público.

## Cómo publicar un documento (Documentos o Fiscalía)
1. Copia el PDF a la carpeta `asociados/docs/` (créala si no existe). Si es de Fiscalía, puedes usar `asociados/docs/fiscalia/`.
   Usa nombres sin tildes ni espacios si puedes: `acta-asamblea-2026.pdf`.
2. Abre `asociados/data/documentos.json` (o `fiscalia.json`) y agrega un bloque dentro de la categoría que corresponda:

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
