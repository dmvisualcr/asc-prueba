/* DOCUMENTOS.JS — lista de documentos de /asociados/documentos.html y /asociados/fiscalia.html.
   Lee el archivo indicado en data-fuente (por ejemplo data/documentos.json). Ese archivo y los PDF
   viven dentro de /asociados/, así que el servidor solo los entrega a quien tenga sesión abierta. */
(function () {
  'use strict';

  var cont = document.getElementById('lista-documentos');
  if (!cont) return;
  var barra = document.getElementById('docs-barra');
  var buscar = document.getElementById('buscar-doc');
  var chips = document.getElementById('docs-chips');
  var vacio = cont.dataset.vacio || 'Todavía no hay documentos publicados en esta sección.';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  var categorias = [];
  var actual = 'Todas';
  var consulta = '';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function limpiar(t) {
    return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function fecha(iso) {
    var p = String(iso || '').split('-').map(Number);
    return p.length === 3 && !isNaN(p[0]) ? p[2] + ' de ' + MESES[p[1] - 1] + ' de ' + p[0] : '';
  }

  function icono(ruta) {
    var ext = (String(ruta).split('?')[0].split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return 'fa-file-pdf';
    if (ext === 'xls' || ext === 'xlsx') return 'fa-file-excel';
    if (ext === 'doc' || ext === 'docx') return 'fa-file-word';
    return 'fa-file-lines';
  }

  function filaDocumento(d) {
    var meta = [fecha(d.fecha), d.descripcion].filter(Boolean).map(esc).join(' · ');
    var url = /^https?:\/\//.test(d.archivo) ? d.archivo : encodeURI(d.archivo);
    return '<a class="doc-row" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="doc-icon"><i class="fas ' + icono(d.archivo) + '"></i></span>' +
      '<span class="doc-info"><strong>' + esc(d.titulo) + '</strong>' + (meta ? '<small>' + meta + '</small>' : '') + '</span>' +
      '<span class="doc-open"><span>Ver</span> <i class="fas fa-arrow-up-right-from-square"></i></span></a>';
  }

  function pintar() {
    var q = limpiar(consulta);
    var html = categorias.filter(function (c) { return actual === 'Todas' || c.nombre === actual; }).map(function (c) {
      var docs = c.documentos.filter(function (d) { return !q || limpiar(d.titulo + ' ' + (d.descripcion || '')).indexOf(q) !== -1; });
      if (!docs.length) return '';
      return '<section class="docs-cat"><h2>' + esc(c.nombre) + '</h2>' +
        (c.descripcion ? '<p class="docs-cat-desc">' + esc(c.descripcion) + '</p>' : '') +
        '<div class="docs-list">' + docs.map(filaDocumento).join('') + '</div></section>';
    }).join('');
    cont.innerHTML = html || '<p class="empty-note">No encontramos documentos con esa búsqueda.</p>';
  }

  fetch(cont.dataset.fuente, { credentials: 'same-origin', cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('no se pudo leer la lista'); return r.json(); })
    .then(function (datos) {
      categorias = (datos.categorias || []).map(function (c) {
        return {
          nombre: c.nombre,
          descripcion: c.descripcion || '',
          documentos: (c.documentos || []).slice().sort(function (a, b) { return String(b.fecha || '').localeCompare(String(a.fecha || '')); })
        };
      }).filter(function (c) { return c.documentos.length; });

      if (!categorias.length) { cont.innerHTML = '<p class="empty-note">' + esc(vacio) + '</p>'; return; }

      barra.hidden = false;
      if (categorias.length > 1) {
        chips.innerHTML = ['Todas'].concat(categorias.map(function (c) { return c.nombre; })).map(function (n) {
          return '<button type="button" class="news-chip" data-cat="' + esc(n) + '" aria-pressed="' + (n === 'Todas') + '">' + esc(n) + '</button>';
        }).join('');
        chips.addEventListener('click', function (e) {
          var b = e.target.closest('.news-chip');
          if (!b) return;
          actual = b.dataset.cat;
          chips.querySelectorAll('.news-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          pintar();
        });
      }
      buscar.addEventListener('input', function () { consulta = buscar.value; pintar(); });
      pintar();
    })
    .catch(function () { cont.innerHTML = '<p class="empty-note">No se pudo cargar la lista de documentos. Intenta de nuevo en unos minutos.</p>'; });
})();
