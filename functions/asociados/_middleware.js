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
  // "private" = ninguna caché compartida (como la de Cloudflare) guarda contenido privado.
  // Las fotos y los PDF pueden guardarse en el navegador de la persona por un rato (así los álbumes cargan
  // rápido al volver a verlos); las páginas y los datos no.
  const tipo = respuesta.headers.get('Content-Type') || '';
  const esArchivo = /^(image|video|audio)\//.test(tipo) || tipo.includes('pdf');
  salida.headers.set('Cache-Control', esArchivo ? 'private, max-age=3600' : 'private, no-store');
  salida.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return salida;
}
