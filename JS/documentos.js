/* DOCUMENTOS.JS — lista de documentos de /asociados/documentos.html.
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

  // Las rutas se guardan relativas a /asociados/ ("docs/archivo.pdf"). Si alguien escribe "asociados/docs/…" se corrige solo.
  function arreglarRuta(a) {
    return String(a || '').trim().replace(/^\/?asociados\//i, '');
  }

  // Cuando cada documento se escribe suelto (sin categoría), se agrupa por palabra clave del título.
  function categoriaAutomatica(titulo) {
    var t = limpiar(titulo);
    if (/reglament/.test(t)) return 'Reglamentos';
    if (/informe/.test(t)) return 'Informes';
    if (/estatuto/.test(t)) return 'Estatutos';
    if (/\bacta/.test(t)) return 'Actas';
    if (/financ/.test(t)) return 'Estados financieros';
    if (/convenio/.test(t)) return 'Convenios';
    return 'Otros documentos';
  }

  // Acepta tres formas de escribir data/documentos.json:
  //  1) categorias: [{ nombre, documentos: [ {titulo, archivo, fecha, descripcion}, … ] }]   (la recomendada)
  //  2) categorias: [{ nombre, descripcion, documentos: "docs/archivo.pdf" }]               (un documento por entrada)
  //  3) documentos: [ {titulo, archivo, categoria, …} ]                                      (lista plana)
  function aCategorias(datos) {
    var porNombre = {}, orden = [];
    function categoria(nombre, descripcion) {
      if (!porNombre[nombre]) { porNombre[nombre] = { nombre: nombre, descripcion: descripcion || '', documentos: [] }; orden.push(nombre); }
      return porNombre[nombre];
    }
    (datos.categorias || []).forEach(function (c) {
      if (Array.isArray(c.documentos)) {
        var cat = categoria(c.nombre, c.descripcion);
        c.documentos.forEach(function (d) { cat.documentos.push(d); });
      } else if (typeof c.documentos === 'string' && c.documentos) {
        categoria(categoriaAutomatica(c.nombre)).documentos.push({ titulo: c.nombre, descripcion: c.descripcion, archivo: c.documentos, fecha: c.fecha });
      }
    });
    (datos.documentos || []).forEach(function (d) { categoria(d.categoria || 'Documentos').documentos.push(d); });

    return orden.map(function (n) {
      var c = porNombre[n];
      c.documentos = c.documentos.filter(function (d) { return d && d.titulo && d.archivo; }).map(function (d) {
        var desc = d.descripcion || '';
        // si la descripción solo repite el título, no se muestra dos veces
        var a = limpiar(desc).replace(/[^a-z0-9]/g, ''), b = limpiar(d.titulo).replace(/[^a-z0-9]/g, '');
        if (a && (b.indexOf(a) !== -1 || a.indexOf(b) !== -1)) desc = '';
        return { titulo: d.titulo, descripcion: desc, archivo: arreglarRuta(d.archivo), fecha: d.fecha };
      }).sort(function (x, y) { return String(y.fecha || '').localeCompare(String(x.fecha || '')); });
      return c;
    }).filter(function (c) { return c.documentos.length; });
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
      categorias = aCategorias(datos);

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
