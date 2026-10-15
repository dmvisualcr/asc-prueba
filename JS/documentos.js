/* DOCUMENTOS.JS — lista de documentos con visor integrado sin botones de descarga/impresión.
   Nota: esto oculta las opciones de la interfaz; no impide guardar un PDF accesible por URL directa. */
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
  var pdfjsReady = null;
  var pdfDoc = null;
  var paginaActual = 1;
  var escala = 1;
  var renderTask = null;

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
  function arreglarRuta(a) {
    return String(a || '').trim().replace(/^\/?asociados\//i, '');
  }
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
      c.documentos = c.documentos.filter(function (d) { return d && d.titulo && (d.archivo || d.documentos); }).map(function (d) {
        var desc = d.descripcion || '';
        var titulo = String(d.titulo || 'Documento');
        var a = limpiar(desc).replace(/[^a-z0-9]/g, ''), b = limpiar(titulo).replace(/[^a-z0-9]/g, '');
        if (a && (b.indexOf(a) !== -1 || a.indexOf(b) !== -1)) desc = '';
        return { titulo: titulo, descripcion: desc, archivo: arreglarRuta(d.archivo || d.documentos), fecha: d.fecha };
      }).sort(function (x, y) { return String(y.fecha || '').localeCompare(String(x.fecha || '')); });
      return c;
    }).filter(function (c) { return c.documentos.length; });
  }

  function crearVisor() {
    if (document.getElementById('visor-pdf-asociados')) return;
    var modal = document.createElement('div');
    modal.id = 'visor-pdf-asociados';
    modal.className = 'pdf-viewer-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'visor-pdf-titulo');
    modal.innerHTML = '<div class="pdf-viewer-backdrop" data-cerrar-visor></div>' +
      '<section class="pdf-viewer-panel"><header class="pdf-viewer-header"><h2 id="visor-pdf-titulo">Documento</h2><button type="button" class="pdf-v-btn pdf-v-cerrar" aria-label="Cerrar documento" data-cerrar-visor><i class="fas fa-times" aria-hidden="true"></i><span>Cerrar</span></button></header>' +
      '<div class="pdf-viewer-toolbar"><button type="button" class="pdf-v-btn" id="pdf-anterior" aria-label="Página anterior"><i class="fas fa-chevron-left"></i></button><span id="pdf-pagina-info">Página 1 de 1</span><button type="button" class="pdf-v-btn" id="pdf-siguiente" aria-label="Página siguiente"><i class="fas fa-chevron-right"></i></button><span class="pdf-v-separador"></span><button type="button" class="pdf-v-btn" id="pdf-alejar" aria-label="Alejar"><i class="fas fa-minus"></i></button><span id="pdf-zoom-info">100%</span><button type="button" class="pdf-v-btn" id="pdf-acercar" aria-label="Acercar"><i class="fas fa-plus"></i></button></div>' +
      '<div class="pdf-viewer-body" id="pdf-viewer-body"><p class="pdf-viewer-status" id="pdf-viewer-status">Cargando documento…</p><canvas id="pdf-viewer-canvas" aria-label="Página del documento PDF"></canvas></div></section>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-cerrar-visor]')) cerrarVisor();
    });
    document.getElementById('pdf-anterior').addEventListener('click', function () { if (pdfDoc && paginaActual > 1) { paginaActual--; dibujarPagina(); } });
    document.getElementById('pdf-siguiente').addEventListener('click', function () { if (pdfDoc && paginaActual < pdfDoc.numPages) { paginaActual++; dibujarPagina(); } });
    document.getElementById('pdf-acercar').addEventListener('click', function () { escala = Math.min(2.5, escala + 0.15); dibujarPagina(); });
    document.getElementById('pdf-alejar').addEventListener('click', function () { escala = Math.max(0.55, escala - 0.15); dibujarPagina(); });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') cerrarVisor();
      if (e.key === 'ArrowLeft' && pdfDoc && paginaActual > 1) { paginaActual--; dibujarPagina(); }
      if (e.key === 'ArrowRight' && pdfDoc && paginaActual < pdfDoc.numPages) { paginaActual++; dibujarPagina(); }
    });
  }

  function cargarPDFjs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise(function (resolve, reject) {
      if (window.pdfjsLib) { configurarPDFjs(); resolve(window.pdfjsLib); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = function () { if (!window.pdfjsLib) { reject(new Error('No se pudo iniciar el visor PDF.')); return; } configurarPDFjs(); resolve(window.pdfjsLib); };
      s.onerror = function () { reject(new Error('No se pudo cargar el visor PDF. Revisa la conexión a internet.')); };
      document.head.appendChild(s);
    });
    return pdfjsReady;
  }
  function configurarPDFjs() {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  function abrirVisor(url, titulo) {
    crearVisor();
    var modal = document.getElementById('visor-pdf-asociados');
    modal.hidden = false;
    document.body.classList.add('pdf-viewer-open');
    document.getElementById('visor-pdf-titulo').textContent = titulo;
    document.getElementById('pdf-viewer-status').hidden = false;
    document.getElementById('pdf-viewer-status').textContent = 'Cargando documento…';
    document.getElementById('pdf-viewer-canvas').hidden = true;
    document.getElementById('pdf-pagina-info').textContent = 'Cargando…';
    pdfDoc = null; paginaActual = 1; escala = 1;
    cargarPDFjs().then(function (lib) {
      return lib.getDocument({ url: url, withCredentials: true }).promise;
    }).then(function (doc) {
      pdfDoc = doc;
      document.getElementById('pdf-viewer-status').hidden = true;
      document.getElementById('pdf-viewer-canvas').hidden = false;
      dibujarPagina();
    }).catch(function (err) {
      var status = document.getElementById('pdf-viewer-status');
      status.hidden = false;
      status.textContent = 'No se pudo abrir este documento. Comprueba que el archivo exista y que el servidor permita mostrarlo dentro de la página.';
      document.getElementById('pdf-pagina-info').textContent = 'Documento no disponible';
      console.error('Error al abrir PDF:', err);
    });
  }
  function dibujarPagina() {
    if (!pdfDoc) return;
    if (renderTask) { try { renderTask.cancel(); } catch (_) {} }
    var canvas = document.getElementById('pdf-viewer-canvas');
    var ctx = canvas.getContext('2d');
    pdfDoc.getPage(paginaActual).then(function (page) {
      var base = page.getViewport({ scale: 1 });
      var body = document.getElementById('pdf-viewer-body');
      var anchoDisponible = Math.max(280, body.clientWidth - 32);
      var ajuste = Math.min(1.5, anchoDisponible / base.width);
      var viewport = page.getViewport({ scale: ajuste * escala });
      var ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderTask = page.render({ canvasContext: ctx, viewport: viewport });
      return renderTask.promise;
    }).then(function () {
      document.getElementById('pdf-pagina-info').textContent = 'Página ' + paginaActual + ' de ' + pdfDoc.numPages;
      document.getElementById('pdf-zoom-info').textContent = Math.round(escala * 100) + '%';
      document.getElementById('pdf-anterior').disabled = paginaActual <= 1;
      document.getElementById('pdf-siguiente').disabled = paginaActual >= pdfDoc.numPages;
      document.getElementById('pdf-viewer-body').scrollTop = 0;
    }).catch(function (err) { if (err && err.name !== 'RenderingCancelledException') console.error(err); });
  }
  function cerrarVisor() {
    var modal = document.getElementById('visor-pdf-asociados');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pdf-viewer-open');
    if (renderTask) { try { renderTask.cancel(); } catch (_) {} renderTask = null; }
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (_) {} pdfDoc = null; }
  }
  function filaDocumento(d) {
    var meta = [fecha(d.fecha), d.descripcion].filter(Boolean).map(esc).join(' · ');
    var url = /^https?:\/\//.test(d.archivo) ? d.archivo : encodeURI(d.archivo);
    if (!/\.pdf(?:$|[?#])/i.test(url)) {
      return '<a class="doc-row" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><span class="doc-icon"><i class="fas ' + icono(d.archivo) + '"></i></span><span class="doc-info"><strong>' + esc(d.titulo) + '</strong>' + (meta ? '<small>' + meta + '</small>' : '') + '</span><span class="doc-open"><span>Ver</span> <i class="fas fa-arrow-up-right-from-square"></i></span></a>';
    }
    return '<button type="button" class="doc-row pdf-doc-open" data-pdf-url="' + esc(url) + '" data-pdf-title="' + esc(d.titulo) + '"><span class="doc-icon"><i class="fas ' + icono(d.archivo) + '"></i></span><span class="doc-info"><strong>' + esc(d.titulo) + '</strong>' + (meta ? '<small>' + meta + '</small>' : '') + '</span><span class="doc-open"><span>Ver</span> <i class="fas fa-eye"></i></span></button>';
  }
  function pintar() {
    var q = limpiar(consulta);
    var html = categorias.filter(function (c) { return actual === 'Todas' || c.nombre === actual; }).map(function (c) {
      var docs = c.documentos.filter(function (d) { return !q || limpiar(d.titulo + ' ' + (d.descripcion || '')).indexOf(q) !== -1; });
      if (!docs.length) return '';
      return '<section class="docs-cat"><h2>' + esc(c.nombre) + '</h2>' + (c.descripcion ? '<p class="docs-cat-desc">' + esc(c.descripcion) + '</p>' : '') + '<div class="docs-list">' + docs.map(filaDocumento).join('') + '</div></section>';
    }).join('');
    cont.innerHTML = html || '<p class="empty-note">No encontramos documentos con esa búsqueda.</p>';
  }
  cont.addEventListener('click', function (e) {
    var btn = e.target.closest('.pdf-doc-open');
    if (!btn) return;
    abrirVisor(btn.dataset.pdfUrl, btn.dataset.pdfTitle || 'Documento');
  });

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
