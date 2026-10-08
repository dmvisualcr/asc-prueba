// POST /api/auth/salir — cierra la sesión (borra la sesión de la base y la cookie).
import { json, huella, leerCookie, mismoOrigen, cookieSesion, configurado, COOKIE } from '../../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!mismoOrigen(request)) return json({ ok: false, mensaje: 'Solicitud no permitida.' }, 403);
  const token = leerCookie(request, COOKIE);
  if (token && configurado(env)) {
    const clave = await huella(env.AUTH_SECRET, `sesion:${token}`);
    await env.DB.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(clave).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSesion('', 0) });
}
