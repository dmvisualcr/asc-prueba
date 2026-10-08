// Protege TODO lo que esté dentro de /asociados/ (páginas, imágenes, PDF…).
// Sin sesión válida, manda a la página de acceso. El servidor decide, no el navegador.
import { socioDeSesion } from '../_lib/util.js';

export async function onRequest({ request, env, next }) {
  let socio = null;
  try { socio = await socioDeSesion(request, env); } catch (e) { console.error(e.message); }

  if (!socio) {
    const url = new URL(request.url);
    const destino = new URL('/paginicio/acceso-asociados.html', url);
    destino.searchParams.set('volver', url.pathname);
    return new Response(null, { status: 302, headers: { Location: destino.toString(), 'Cache-Control': 'no-store' } });
  }

  const respuesta = await next();
  const salida = new Response(respuesta.body, respuesta);
  salida.headers.set('Cache-Control', 'private, no-store'); // que ninguna caché compartida guarde contenido privado
  salida.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return salida;
}
