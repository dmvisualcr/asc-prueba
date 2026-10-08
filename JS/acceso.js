/* ACCESO.JS — página de acceso de asociados: pide el código por correo y lo verifica.
   Todo el control de seguridad está en el servidor (carpeta /functions); aquí solo está la pantalla. */
(function () {
  'use strict';

  var paso1 = document.getElementById('form-paso1');
  var paso2 = document.getElementById('form-paso2');
  var panelSesion = document.getElementById('acceso-sesion');
  var intro = document.getElementById('acceso-intro');
  var msg = document.getElementById('acceso-mensaje');
  var datos = null;
  var cuentaAtras = null;

  function mostrar(texto, tipo) {
    msg.textContent = texto || '';
    msg.className = 'access-msg' + (tipo ? ' is-' + tipo : '');
  }

  // Solo se acepta volver a páginas internas de /asociados/ (evita redirecciones a otros sitios)
  function destino() {
    var v = new URLSearchParams(location.search).get('volver') || '';
    return /^\/asociados\/[A-Za-z0-9_\-\/.%]*$/.test(v) && v.indexOf('..') === -1 ? v : '/asociados/';
  }

  function post(ruta, cuerpo) {
    return fetch(ruta, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo || {})
    }).then(function (r) {
      return r.json().catch(function () {
        return { ok: false, mensaje: 'El acceso solo funciona en el sitio publicado en Cloudflare, no en esta vista de prueba.' };
      });
    }).catch(function () {
      return { ok: false, mensaje: 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.' };
    });
  }

  function ocupado(boton, texto, estado) {
    boton.disabled = estado;
    if (estado) { boton.dataset.original = boton.textContent; boton.textContent = texto; }
    else if (boton.dataset.original) { boton.textContent = boton.dataset.original; }
  }

  function pedirCodigo(boton) {
    ocupado(boton, 'Enviando…', true);
    return post('/api/auth/solicitar-codigo', {
      numero_socio: datos.numero_socio, correo: datos.correo, consentimiento: true
    }).then(function (j) {
      ocupado(boton, '', false);
      return j;
    });
  }

  function pasoDos() {
    paso1.hidden = true;
    paso2.hidden = false;
    intro.hidden = true;
    document.getElementById('correo-enviado').textContent = datos.correo;
    document.getElementById('codigo').value = '';
    document.getElementById('codigo').focus();
    bloquearReenvio(30);
  }

  function bloquearReenvio(segundos) {
    var boton = document.getElementById('reenviar');
    clearInterval(cuentaAtras);
    boton.disabled = true;
    var restante = segundos;
    boton.textContent = 'Reenviar código (' + restante + ')';
    cuentaAtras = setInterval(function () {
      restante--;
      if (restante <= 0) { clearInterval(cuentaAtras); boton.disabled = false; boton.textContent = 'Reenviar código'; }
      else { boton.textContent = 'Reenviar código (' + restante + ')'; }
    }, 1000);
  }

  paso1.addEventListener('submit', function (e) {
    e.preventDefault();
    var numero = document.getElementById('numero_socio').value.trim();
    var correo = document.getElementById('correo').value.trim().toLowerCase();
    if (!numero) return mostrar('Escribe tu número de socio.', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return mostrar('Escribe un correo válido.', 'error');
    if (!document.getElementById('consentimiento').checked) return mostrar('Debes aceptar el aviso de privacidad para continuar.', 'error');
    datos = { numero_socio: numero, correo: correo };
    mostrar('');
    pedirCodigo(document.getElementById('enviar-codigo')).then(function (j) {
      if (!j.ok) return mostrar(j.mensaje, 'error');
      pasoDos();
      mostrar(j.mensaje, 'ok');
    });
  });

  // El código se limpia mientras se escribe o se pega: "123 456" queda como "123456"
  document.getElementById('codigo').addEventListener('input', function () {
    var limpio = this.value.replace(/\D/g, '').slice(0, 6);
    if (this.value !== limpio) this.value = limpio;
  });

  paso2.addEventListener('submit', function (e) {
    e.preventDefault();
    var codigo = document.getElementById('codigo').value.replace(/\D/g, '');
    if (codigo.length !== 6) return mostrar('Escribe el código de 6 dígitos.', 'error');
    var boton = document.getElementById('entrar');
    ocupado(boton, 'Verificando…', true);
    post('/api/auth/verificar-codigo', { numero_socio: datos.numero_socio, correo: datos.correo, codigo: codigo }).then(function (j) {
      if (j.ok) { mostrar('¡Listo! Entrando…', 'ok'); location.href = destino(); return; }
      ocupado(boton, '', false);
      mostrar(j.mensaje, 'error');
    });
  });

  document.getElementById('reenviar').addEventListener('click', function () {
    pedirCodigo(this).then(function (j) {
      mostrar(j.ok ? 'Te enviamos un código nuevo.' : j.mensaje, j.ok ? 'ok' : 'error');
      if (j.ok) bloquearReenvio(30);
    });
  });

  document.getElementById('otros-datos').addEventListener('click', function () {
    clearInterval(cuentaAtras);
    paso2.hidden = true;
    paso1.hidden = false;
    intro.hidden = false;
    mostrar('');
  });

  document.getElementById('cerrar-sesion').addEventListener('click', function () {
    post('/api/auth/salir').then(function () { location.reload(); });
  });

  // Si ya hay una sesión abierta, se ofrece ir directo a la cuenta
  fetch('/api/yo', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.autenticado) return;
      paso1.hidden = true;
      intro.hidden = true;
      panelSesion.hidden = false;
      document.getElementById('sesion-nombre').textContent = j.socio.nombre;
    })
    .catch(function () {});
})();
