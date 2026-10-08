// POST /api/auth/verificar-codigo
// Recibe { numero_socio, correo, codigo }. Si el código es correcto crea la sesión
// (cookie segura de 30 días). La primera vez que alguien entra, su cuenta queda activada.
import {
  ahora, json, huella, iguales, tokenAleatorio, mismoOrigen, normalizarCorreo, correoValido, normalizarSocio,
  cookieSesion, configurado, DURACION_SESION, MAX_INTENTOS,
} from '../../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!mismoOrigen(request)) return json({ ok: false, mensaje: 'Solicitud no permitida.' }, 403);
  if (!configurado(env)) return json({ ok: false, mensaje: 'El acceso no está disponible por el momento.' }, 503);

  let datos;
  try { datos = await request.json(); } catch { return json({ ok: false, mensaje: 'Datos inválidos.' }, 400); }

  const numero = normalizarSocio(datos.numero_socio);
  const correo = normalizarCorreo(datos.correo);
  const codigo = String(datos.codigo || '').replace(/\D/g, '');
  if (!numero || !correoValido(correo) || codigo.length !== 6) return json({ ok: false, mensaje: 'Escribe el código de 6 dígitos que te llegó al correo.' }, 400);

  const fallo = () => json({ ok: false, mensaje: 'Código incorrecto o vencido. Si hace falta, pide uno nuevo.' }, 400);

  const socio = await env.DB.prepare(
    "SELECT id, nombre FROM socios WHERE numero_socio = ? AND lower(correo) = ? AND estado = 'activo'"
  ).bind(numero, correo).first();
  if (!socio) return fallo();

  const t = ahora();
  const fila = await env.DB.prepare(
    'SELECT id, codigo_hash, intentos FROM codigos WHERE socio_id = ? AND usado = 0 AND expira_en > ? ORDER BY id DESC LIMIT 1'
  ).bind(socio.id, t).first();
  if (!fila || fila.intentos >= MAX_INTENTOS) return fallo();

  const esperado = await huella(env.AUTH_SECRET, `codigo:${socio.id}:${codigo}`);
  if (!iguales(esperado, fila.codigo_hash)) {
    await env.DB.prepare('UPDATE codigos SET intentos = intentos + 1 WHERE id = ?').bind(fila.id).run();
    return fallo();
  }

  // Correcto: se invalidan todos los códigos del asociado y se crea la sesión.
  await env.DB.prepare('UPDATE codigos SET usado = 1 WHERE socio_id = ?').bind(socio.id).run();
  const token = tokenAleatorio();
  const clave = await huella(env.AUTH_SECRET, `sesion:${token}`);
  await env.DB.prepare('DELETE FROM sesiones WHERE expira_en < ?').bind(t).run();
  await env.DB.prepare('INSERT INTO sesiones (token_hash, socio_id, expira_en, creado_en) VALUES (?, ?, ?, ?)').bind(clave, socio.id, t + DURACION_SESION, t).run();
  await env.DB.prepare("UPDATE socios SET cuenta_activada_en = COALESCE(cuenta_activada_en, datetime('now')), ultimo_acceso = datetime('now') WHERE id = ?").bind(socio.id).run();

  return json({ ok: true, nombre: socio.nombre }, 200, { 'Set-Cookie': cookieSesion(token, DURACION_SESION) });
}
