/* ASOCIADOS.JS — comportamiento común de la zona de asociados (/asociados/):
   cierra la sesión desde el menú y revisa la sesión si se vuelve con el botón "atrás". */
(function () {
  'use strict';

  var salir = document.getElementById('nav-salir');
  if (salir) {
    salir.addEventListener('click', function (e) {
      e.preventDefault();
      fetch('/api/auth/salir', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      }).finally(function () { location.href = '/index.html'; });
    });
  }

  // Si el navegador muestra una copia guardada de la página (botón "atrás") después de cerrar sesión,
  // se vuelve a comprobar la sesión y, si ya no hay, se manda al acceso.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    fetch('/api/yo', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.autenticado) location.href = '/paginicio/acceso-asociados.html'; })
      .catch(function () {});
  });
})();
