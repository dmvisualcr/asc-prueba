// POST /api/auth/solicitar-codigo
// Recibe { numero_socio, correo, consentimiento } y, si coinciden con un asociado activo,
// le manda un código de 6 dígitos al correo. La respuesta es la misma exista o no el
// asociado, para que nadie pueda averiguar quién es socio.
import {
  ahora, json, huella, codigoAleatorio, mismoOrigen, normalizarCorreo, correoValido, normalizarSocio,
  enviarCodigo, configurado, DURACION_CODIGO, MAX_CODIGOS_POR_HORA,
} from '../../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!mismoOrigen(request)) return json({ ok: false, mensaje: 'Solicitud no permitida.' }, 403);
  if (!configurado(env)) {
    console.error('Falta configurar la base de datos (DB) o AUTH_SECRET.');
    return json({ ok: false, mensaje: 'El acceso no está disponible por el momento.' }, 503);
  }

  let datos;
  try { datos = await request.json(); } catch { return json({ ok: false, mensaje: 'Datos inválidos.' }, 400); }

  const numero = normalizarSocio(datos.numero_socio);
  const correo = normalizarCorreo(datos.correo);
  if (!numero || !correoValido(correo)) return json({ ok: false, mensaje: 'Revisa tu número de socio y tu correo.' }, 400);
  if (datos.consentimiento !== true) return json({ ok: false, mensaje: 'Debes aceptar el aviso de privacidad para continuar.' }, 400);

  const generica = {
    ok: true,
    mensaje: 'Si los datos coinciden con un asociado activo, te enviamos un código de 6 dígitos a tu correo. Revisa también la carpeta de spam.',
  };

  const socio = await env.DB.prepare(
    "SELECT id, nombre, correo FROM socios WHERE numero_socio = ? AND lower(correo) = ? AND estado = 'activo'"
  ).bind(numero, correo).first();
  if (!socio) return json(generica);

  const t = ahora();
  const recientes = await env.DB.prepare('SELECT COUNT(*) AS n FROM codigos WHERE socio_id = ? AND creado_en > ?').bind(socio.id, t - 3600).first();
  if (recientes.n >= MAX_CODIGOS_POR_HORA) return json({ ok: false, mensaje: 'Pediste muchos códigos. Espera un rato e intenta de nuevo.' }, 429);

  const codigo = codigoAleatorio();
  const clave = await huella(env.AUTH_SECRET, `codigo:${socio.id}:${codigo}`);
  await env.DB.prepare('INSERT INTO codigos (socio_id, codigo_hash, expira_en, creado_en) VALUES (?, ?, ?, ?)').bind(socio.id, clave, t + DURACION_CODIGO, t).run();
  await env.DB.prepare("UPDATE socios SET consentimiento_en = COALESCE(consentimiento_en, datetime('now')) WHERE id = ?").bind(socio.id).run();
  await env.DB.prepare('DELETE FROM codigos WHERE creado_en < ?').bind(t - 86400).run(); // limpieza

  try {
    await enviarCodigo(env, socio.correo, socio.nombre, codigo);
  } catch (e) {
    console.error('No se pudo enviar el correo:', e.message); // se ve en el registro de la función
  }
  return json(generica);
}
