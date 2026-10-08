// GET /api/yo — dice si hay una sesión activa y devuelve los datos básicos del asociado.
import { json, socioDeSesion } from '../_lib/util.js';

export async function onRequestGet({ request, env }) {
  let socio = null;
  try { socio = await socioDeSesion(request, env); } catch (e) { console.error(e.message); }
  if (!socio) return json({ autenticado: false });
  const { id, ...datos } = socio; // el id interno no sale al navegador
  return json({ autenticado: true, socio: datos });
}
