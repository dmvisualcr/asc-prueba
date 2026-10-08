// Utilidades compartidas por las funciones de acceso (Cloudflare Pages Functions).
// Todo usa APIs estándar del navegador (fetch, crypto.subtle): no hay nada que instalar.

export const COOKIE = 'csh_sesion';
export const DURACION_SESION = 60 * 60 * 24 * 30; // 30 días, en segundos
export const DURACION_CODIGO = 60 * 10;           // el código vale 10 minutos
export const MAX_INTENTOS = 5;                    // intentos fallidos por código
export const MAX_CODIGOS_POR_HORA = 5;            // códigos que se pueden pedir por hora

const enc = new TextEncoder();

export function ahora() {
  return Math.floor(Date.now() / 1000);
}

export function json(datos, status = 200, cabeceras = {}) {
  return new Response(JSON.stringify(datos), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cabeceras },
  });
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Firma un texto con una llave secreta (HMAC-SHA256). Así en la base de datos nunca
// se guardan los códigos ni las sesiones tal cual, solo su "huella".
export async function huella(secreto, texto) {
  const llave = await crypto.subtle.importKey('raw', enc.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', llave, enc.encode(texto)));
}

// Comparación que no revela, por el tiempo que tarda, cuántos caracteres coinciden.
export function iguales(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

// Código de 6 dígitos, sin sesgo estadístico.
export function codigoAleatorio() {
  const buf = new Uint32Array(1);
  let n;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= 4294000000); // el mayor múltiplo de 1.000.000 que cabe en 32 bits
  return String(n % 1000000).padStart(6, '0');
}

export function tokenAleatorio() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function normalizarCorreo(valor) {
  return String(valor || '').trim().toLowerCase();
}

export function correoValido(correo) {
  return correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function normalizarSocio(valor) {
  return String(valor || '').trim().replace(/\s+/g, '').slice(0, 30);
}

export function leerCookie(request, nombre) {
  const cabecera = request.headers.get('Cookie') || '';
  for (const parte of cabecera.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}

export function cookieSesion(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

// Rechaza peticiones POST que vengan de otro sitio web.
export function mismoOrigen(request) {
  const origen = request.headers.get('Origin');
  if (!origen) return true;
  try {
    return new URL(origen).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function configurado(env) {
  return Boolean(env && env.DB && env.AUTH_SECRET);
}

// Devuelve el asociado de la sesión actual, o null si no hay sesión válida.
export async function socioDeSesion(request, env) {
  const token = leerCookie(request, COOKIE);
  if (!token || !configurado(env)) return null;
  const clave = await huella(env.AUTH_SECRET, `sesion:${token}`);
  return await env.DB.prepare(
    `SELECT s.id, s.numero_socio, s.nombre, s.correo, s.telefono, s.sector, s.tipo_membresia, s.vencimiento
       FROM sesiones se JOIN socios s ON s.id = se.socio_id
      WHERE se.token_hash = ? AND se.expira_en > ? AND s.estado = 'activo'`
  ).bind(clave, ahora()).first();
}

function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Envía el código por correo con Resend (https://resend.com). Si más adelante quieres
// cambiar de servicio, solo hay que tocar esta función.
export async function enviarCodigo(env, destino, nombre, codigo) {
  if (!env.RESEND_API_KEY || !env.CORREO_REMITENTE) throw new Error('Falta RESEND_API_KEY o CORREO_REMITENTE');
  const primerNombre = escaparHtml(String(nombre || '').split(' ')[0] || 'asociado');
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1b1b1b">
    <h2 style="margin:0 0 12px">Hola, ${primerNombre}</h2>
    <p>Este es tu código para entrar a la zona de asociados:</p>
    <p style="font-size:34px;letter-spacing:8px;font-weight:bold;background:#f4f4f4;padding:14px 18px;text-align:center;border-radius:8px">${codigo}</p>
    <p>Vale por 10 minutos. Si no lo pediste tú, ignora este correo.</p>
    <p style="color:#777;font-size:12px">Asociación Deportiva Club Sport Herediano</p></div>`;
  const texto = `Tu código para entrar a la zona de asociados es ${codigo}. Vale por 10 minutos. Si no lo pediste tú, ignora este correo.`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.CORREO_REMITENTE, to: [destino], subject: `Tu código de acceso: ${codigo}`, html, text: texto }),
  });
  if (!r.ok) throw new Error(`Resend respondió ${r.status}: ${await r.text()}`);
}
