/* CUENTA.JS — inicio de la zona de asociados (/asociados/). Los datos vienen de /api/yo. */
(function () {
  'use strict';

  var LOGIN = '/paginicio/acceso-asociados.html';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

  function formatearFecha(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return iso;
    return Number(p[2]) + ' de ' + MESES[Number(p[1]) - 1] + ' de ' + p[0];
  }

  fetch('/api/yo', { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.autenticado) { location.href = LOGIN; return; }
      var s = j.socio;
      document.getElementById('saludo').textContent = 'Hola, ' + String(s.nombre).split(' ')[0];

      document.querySelectorAll('#datos-socio dd[data-campo]').forEach(function (dd) {
        var campo = dd.dataset.campo;
        var valor = s[campo];
        if (campo === 'vencimiento' && valor) valor = formatearFecha(valor);
        if (valor) {
          dd.textContent = valor;
          dd.hidden = false;
          var dt = document.querySelector('#datos-socio dt[data-opcional="' + campo + '"]');
          if (dt) dt.hidden = false;
        } else if (!dd.hasAttribute('hidden')) {
          dd.textContent = 'Sin registrar';
        }
      });

      var renovar = document.getElementById('renovar');
      if (renovar) {
        var texto = 'Hola, quiero renovar mi membresía. Mi número de socio es ' + s.numero_socio + '.';
        renovar.href = 'https://wa.me/50622618489?text=' + encodeURIComponent(texto);
      }
    })
    .catch(function () { location.href = LOGIN; });
})();
