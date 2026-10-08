# Acceso de asociados — guía de instalación

Todo esto se hace UNA sola vez. Al terminar, los asociados entran con su número de socio + correo
(les llega un código de 6 dígitos) y todo lo que esté dentro de `/asociados/` queda protegido.

## 0. Antes de empezar
- Los archivos de este paquete van en las mismas carpetas de tu proyecto (respeta la estructura del zip).
- **Nunca subas tu Excel de asociados a GitHub.** El `.gitignore` incluido protege los archivos que
  empiecen con `socios`. Si ya tenías un `.gitignore`, copia las líneas de este al tuyo.
- Si tu repositorio es público, **no pongas documentos privados dentro de él** (cualquiera los vería
  en GitHub aunque la página esté protegida). Cloudflare Pages también funciona con repositorios privados.

## 1. Crear la base de datos (Cloudflare D1)
1. Cloudflare → **Workers y Pages → D1** (o "Storage & databases → D1") → **Create database**.
2. Nombre: `asociados-csh`.
3. Abre la base → pestaña **Console** → pega TODO el contenido de `db/schema.sql` → **Execute**.

## 2. Conectar la base a tu proyecto de Pages
Cloudflare → **Workers y Pages** → tu proyecto → **Settings → Bindings → Add → D1 database**
- Variable name: `DB`  (exactamente así, en mayúsculas)
- D1 database: `asociados-csh`

## 3. Variables secretas
En el mismo proyecto: **Settings → Variables and Secrets → Add**

| Nombre | Tipo | Valor |
|---|---|---|
| `AUTH_SECRET` | Secret | un texto largo y al azar (ver abajo) |
| `RESEND_API_KEY` | Secret | la llave de Resend (paso 4) |
| `CORREO_REMITENTE` | Text | `Asociación CSH <acceso@ascherediano.com>` |

Para generar `AUTH_SECRET` en Windows (PowerShell):
`[guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")`

## 4. Envío de correos (Resend)
1. Crea una cuenta en https://resend.com (gratis para empezar; revisa los límites vigentes).
2. **Domains → Add Domain** → `ascherediano.com`. Resend te da unos registros DNS: agrégalos en
   Cloudflare → tu dominio → **DNS → Records**. Luego pulsa **Verify**.
3. **API Keys → Create API Key** (permiso "Sending access") → pega la llave en `RESEND_API_KEY`.

*Para probar ANTES de verificar el dominio:* en `CORREO_REMITENTE` usa `onboarding@resend.dev` y prueba con un
asociado de prueba cuyo correo sea el mismo con el que creaste la cuenta de Resend (solo a ese correo deja enviar).

## 5. Cargar la lista de asociados
1. En tu computadora: `python scripts/preparar_socios.py ruta/a/asociados.xlsx`
   (para .xlsx hace falta `pip install openpyxl`; también acepta CSV).
   La columna de **identificación/cédula se ignora a propósito**: no hace falta para entrar.
2. Revisa `socios-revision.txt` (filas con problemas: correo vacío, número repetido, fecha rara…).
3. Carga el archivo `socios-importar.sql`:
   - Opción A: D1 → **Console** → pega el contenido y ejecuta (si es muy largo, hazlo por partes).
   - Opción B: `npx wrangler d1 execute asociados-csh --remote --file=socios-importar.sql`
4. Se puede repetir cuando haya cambios: actualiza los datos sin duplicar ni tocar el estado de nadie.
5. **Borra o guarda fuera del proyecto** el `.sql` y el Excel cuando termines.

## 6. Publicar y probar
1. Sube los archivos al repositorio (commit + push). Cloudflare publica solo.
2. Abre `https://TU-PROYECTO.pages.dev/paginicio/acceso-asociados.html`.
3. Prueba con un asociado de prueba: pide el código → llega el correo → entras a `/asociados/`.
4. Prueba también: abrir `/asociados/` en una ventana de incógnito (debe mandarte a la página de acceso).

## 7. Operación diaria (en D1 → Console)
```sql
-- Desactivar a un asociado (pierde el acceso al instante)
UPDATE socios SET estado = 'inactivo' WHERE numero_socio = '1234';

-- Reactivarlo
UPDATE socios SET estado = 'activo' WHERE numero_socio = '1234';

-- Cumpleaños de HOY (hora de Costa Rica)
SELECT numero_socio, nombre, correo FROM socios
 WHERE estado = 'activo'
   AND strftime('%m-%d', fecha_nacimiento) = strftime('%m-%d', 'now', '-6 hours');

-- Cumpleaños de ESTE MES
SELECT strftime('%d', fecha_nacimiento) AS dia, numero_socio, nombre, correo FROM socios
 WHERE estado = 'activo'
   AND strftime('%m', fecha_nacimiento) = strftime('%m', 'now', '-6 hours')
 ORDER BY dia;

-- Cuántos ya activaron su cuenta
SELECT COUNT(*) FROM socios WHERE cuenta_activada_en IS NOT NULL;

-- Poner el vencimiento de alguien
UPDATE socios SET vencimiento = '2026-12-31' WHERE numero_socio = '1234';
```

## Si algo falla
- **"El acceso no está disponible por el momento"**: falta el binding `DB` o la variable `AUTH_SECRET`
  (pasos 2 y 3). Después de agregarlos hay que volver a publicar (push o "Retry deployment").
- **No llega el correo**: revisa spam; revisa que el dominio esté verificado en Resend; mira el registro en
  Cloudflare → tu proyecto → **Functions → Real-time logs**.
- **Cualquiera entra a /asociados/ sin sesión**: confirma que la carpeta `functions/` esté en la raíz del
  repositorio (al lado de `index.html`), no dentro de otra carpeta.
