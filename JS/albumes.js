/* ALBUMES.JS — contenido de fotos de Multimedia (zona de asociados).
   - multimedia.html: tarjetas de álbumes (#albumes-grid) y "Trofeos en la Historia del Herediano" (#th-grid).
   - album.html: las fotos de un álbum (#fotos-grid).
   Las dos cosas usan el mismo visor de pantalla completa.
   Los datos los generan scripts/generar_albumes.py y scripts/generar_trofeos_historia.py. */
(function () {
  'use strict';

  var FOTOS_POR_TANDA = 60;
  var TROFEOS_POR_TANDA = 30;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ruta(r) { return encodeURI(r); }
  function limpiar(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function leer(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(url);
      return r.json();
    });
  }

  /* ============ Visor de pantalla completa (compartido) ============ */
  var visor = null, imagen, pie, lista = [], actual = 0, origen = null, inicioX = null;

  function crearVisor() {
    visor = document.createElement('div');
    visor.className = 'visor';
    visor.hidden = true;
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-modal', 'true');
    visor.setAttribute('aria-label', 'Visor de imágenes');
    visor.innerHTML =
      '<button type="button" class="visor-cerrar" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>' +
      '<button type="button" class="visor-nav visor-prev" aria-label="Anterior"><i class="fas fa-chevron-left"></i></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="visor-nav visor-next" aria-label="Siguiente"><i class="fas fa-chevron-right"></i></button>';
    document.body.appendChild(visor);
    imagen = visor.querySelector('img');
    pie = visor.querySelector('figcaption');

    visor.querySelector('.visor-cerrar').addEventListener('click', cerrarVisor);
    visor.querySelector('.visor-prev').addEventListener('click', function () { ir(-1); });
    visor.querySelector('.visor-next').addEventListener('click', function () { ir(1); });
    visor.addEventListener('click', function (e) { if (e.target === visor || e.target.tagName === 'FIGURE') cerrarVisor(); });
    visor.addEventListener('touchstart', function (e) { inicioX = e.changedTouches[0].clientX; }, { passive: true });
    visor.addEventListener('touchend', function (e) {
      if (inicioX == null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      inicioX = null;
      if (Math.abs(dx) > 50) ir(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('keydown', function (e) {
      if (visor.hidden) return;
      if (e.key === 'Escape') cerrarVisor();
      else if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    });
  }

  function mostrarActual() {
    var f = lista[actual];
    imagen.src = ruta(f.src);
    imagen.alt = f.pie || f.titulo || ('Imagen ' + (actual + 1) + ' de ' + lista.length);
    var texto = f.pie || f.titulo;
    pie.textContent = (actual + 1) + ' / ' + lista.length + (texto ? ' · ' + texto : '');
    [actual - 1, actual + 1].forEach(function (i) { if (lista[i]) new Image().src = ruta(lista[i].src); });
  }

  function ir(paso) {
    actual = (actual + paso + lista.length) % lista.length;
    mostrarActual();
  }

  function abrirVisor(items, i, desde) {
    if (!visor) crearVisor();
    lista = items;
    origen = desde;
    actual = i;
    mostrarActual();
    visor.hidden = false;
    document.body.style.overflow = 'hidden';
    visor.querySelector('.visor-cerrar').focus();
  }

  function cerrarVisor() {
    visor.hidden = true;
    imagen.removeAttribute('src');
    document.body.style.overflow = '';
    if (origen && document.body.contains(origen)) origen.focus();
  }

  /* ============ Lista de álbumes (multimedia.html) ============ */
  var gridAlbumes = document.getElementById('albumes-grid');
  if (gridAlbumes) {
    leer('data/albumes.json').then(function (d) {
      var albumes = d.albumes || [];
      if (!albumes.length) {
        gridAlbumes.innerHTML = '<p class="empty-note">Pronto publicaremos aquí los álbumes de fotos.</p>';
        return;
      }
      gridAlbumes.innerHTML = albumes.map(function (a) {
        return '<a class="album-card" href="album.html?a=' + encodeURIComponent(a.id) + '">' +
          '<img src="' + esc(ruta(a.portada)) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="album-info"><strong>' + esc(a.titulo) + '</strong>' +
          '<small>' + plural(a.cantidad, 'foto', 'fotos') + '</small></span></a>';
      }).join('');
    }).catch(function () {
      var sec = document.getElementById('albumes');
      if (sec) sec.hidden = true; // si todavía no existen los datos, no se muestra una sección rota
    });
  }

  /* ============ Trofeos en la Historia del Herediano (multimedia.html) ============ */
  var gridTrofeos = document.getElementById('th-grid');
  if (gridTrofeos && gridTrofeos.dataset.modo === 'fila') {
    // Vista corta: una sola fila con los trofeos más recientes y un botón para ver todos
    var seccionFila = document.getElementById('trofeos-historia');
    var verTodos = document.getElementById('th-ver-todos');
    leer('data/trofeos-historia.json').then(function (d) {
      var todos = (d.trofeos || []).slice().sort(function (a, b) { return (b.anio || 0) - (a.anio || 0); });
      if (!todos.length) {
        gridTrofeos.innerHTML = '<p class="empty-note">Pronto publicaremos aquí los trofeos de la historia del club.</p>';
        if (verTodos) verTodos.parentNode.hidden = true;
        return;
      }
      var items = todos.slice(0, Number(gridTrofeos.dataset.max) || 8).map(function (t) {
        return { src: t.src, etiqueta: t.etiqueta, titulo: t.titulo, pie: t.etiqueta + ' · ' + t.titulo };
      });
      gridTrofeos.innerHTML = items.map(function (t, i) {
        return '<button type="button" class="hist-card" data-i="' + i + '" aria-label="Ver ' + esc(t.pie) + '">' +
          '<img src="' + esc(ruta(t.src)) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="hist-year">' + esc(t.etiqueta) + '</span>' +
          '<span class="hist-name">' + esc(t.titulo) + '</span></button>';
      }).join('');
      if (verTodos) verTodos.textContent = 'Ver todos los trofeos (' + todos.length + ')';

      // Una sola fila: se muestran tantas tarjetas como columnas tenga la pantalla (6 en computadora, 2 en celular…)
      var tarjetas = [].slice.call(gridTrofeos.querySelectorAll('.hist-card'));
      var columnas = function () { return Math.max(1, getComputedStyle(gridTrofeos).gridTemplateColumns.split(' ').length); };
      var ajustar = function () { var n = columnas(); tarjetas.forEach(function (el, i) { el.hidden = i >= n; }); };
      ajustar();
      window.addEventListener('resize', ajustar);

      gridTrofeos.addEventListener('click', function (e) {
        var b = e.target.closest('.hist-card');
        if (b) abrirVisor(items.slice(0, columnas()), Number(b.dataset.i), b);
      });
    }).catch(function () {
      if (seccionFila) seccionFila.hidden = true;
    });
  } else if (gridTrofeos) {
    var secTrofeos = document.getElementById('trofeos-historia');
    var barra = document.getElementById('th-barra');
    var buscar = document.getElementById('th-buscar');
    var chips = document.getElementById('th-chips');
    var mas = document.getElementById('th-mas');
    var trofeos = [], visibles = [], mostrados = 0, categoria = 'Todos', consulta = '';

    var pintarMas = function () {
      var tanda = visibles.slice(mostrados, mostrados + TROFEOS_POR_TANDA);
      gridTrofeos.insertAdjacentHTML('beforeend', tanda.map(function (t, i) {
        return '<button type="button" class="hist-card" data-i="' + (mostrados + i) + '" aria-label="Ver ' + esc(t.etiqueta + ' ' + t.titulo) + '">' +
          '<img src="' + esc(ruta(t.src)) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="hist-year">' + esc(t.etiqueta) + '</span>' +
          '<span class="hist-name">' + esc(t.titulo) + '</span></button>';
      }).join(''));
      mostrados += tanda.length;
      mas.hidden = mostrados >= visibles.length;
    };

    var filtrar = function () {
      var q = limpiar(consulta);
      visibles = trofeos.filter(function (t) {
        return (categoria === 'Todos' || t.categoria === categoria) &&
          (!q || limpiar(t.etiqueta + ' ' + t.titulo).indexOf(q) !== -1);
      }).map(function (t) { return { src: t.src, etiqueta: t.etiqueta, titulo: t.titulo, pie: t.etiqueta + ' · ' + t.titulo, categoria: t.categoria, anio: t.anio }; });
      gridTrofeos.innerHTML = '';
      mostrados = 0;
      mas.hidden = true;
      if (!visibles.length) {
        gridTrofeos.innerHTML = '<p class="empty-note">No encontramos trofeos con esa búsqueda.</p>';
        return;
      }
      pintarMas();
    };

    leer('data/trofeos-historia.json').then(function (d) {
      trofeos = (d.trofeos || []).slice().sort(function (a, b) { return (a.anio || 0) - (b.anio || 0); });
      if (!trofeos.length) {
        gridTrofeos.innerHTML = '<p class="empty-note">Pronto publicaremos aquí los trofeos de la historia del club.</p>';
        return;
      }
      var cats = [];
      trofeos.forEach(function (t) { if (cats.indexOf(t.categoria) === -1) cats.push(t.categoria); });
      barra.hidden = false;
      if (cats.length > 1) {
        chips.innerHTML = ['Todos'].concat(cats).map(function (c) {
          var n = c === 'Todos' ? trofeos.length : trofeos.filter(function (t) { return t.categoria === c; }).length;
          return '<button type="button" class="news-chip" data-cat="' + esc(c) + '" aria-pressed="' + (c === 'Todos') + '">' + esc(c) + ' (' + n + ')</button>';
        }).join('');
        chips.addEventListener('click', function (e) {
          var b = e.target.closest('.news-chip');
          if (!b) return;
          categoria = b.dataset.cat;
          chips.querySelectorAll('.news-chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          filtrar();
        });
      }
      buscar.addEventListener('input', function () { consulta = buscar.value; filtrar(); });
      mas.querySelector('button').addEventListener('click', pintarMas);
      gridTrofeos.addEventListener('click', function (e) {
        var b = e.target.closest('.hist-card');
        if (b) abrirVisor(visibles, Number(b.dataset.i), b);
      });
      filtrar();
    }).catch(function () {
      if (secTrofeos) secTrofeos.hidden = true;
    });
  }

  /* ============ Un álbum (album.html) ============ */
  var gridFotos = document.getElementById('fotos-grid');
  if (gridFotos) {
    var id = new URLSearchParams(location.search).get('a') || '';
    var titulo = document.getElementById('album-titulo');
    var lead = document.getElementById('album-lead');
    var masFotos = document.getElementById('fotos-mas');
    var fotos = [], fotosMostradas = 0;

    var noEncontrado = function () {
      gridFotos.innerHTML = '<p class="empty-note">No encontramos ese álbum. <a href="multimedia.html">Volver a Multimedia</a></p>';
    };

    var fotosMas = function () {
      var tanda = fotos.slice(fotosMostradas, fotosMostradas + FOTOS_POR_TANDA);
      gridFotos.insertAdjacentHTML('beforeend', tanda.map(function (f, i) {
        var n = fotosMostradas + i;
        return '<button type="button" class="foto-item" data-i="' + n + '" aria-label="Ver foto ' + (n + 1) + ' de ' + fotos.length + '">' +
          '<img src="' + esc(ruta(f.mini)) + '" alt="" loading="lazy" decoding="async"></button>';
      }).join(''));
      fotosMostradas += tanda.length;
      masFotos.hidden = fotosMostradas >= fotos.length;
    };

    if (!/^[a-z0-9-]+$/.test(id)) {
      noEncontrado();
    } else {
      leer('data/albumes/' + id + '.json').then(function (d) {
        fotos = d.fotos || [];
        titulo.textContent = d.titulo;
        document.title = d.titulo + ' | Zona de asociados';
        lead.textContent = (d.descripcion ? d.descripcion + ' · ' : '') + plural(fotos.length, 'foto', 'fotos');
        gridFotos.innerHTML = '';
        fotosMas();
        masFotos.querySelector('button').addEventListener('click', fotosMas);
        gridFotos.addEventListener('click', function (e) {
          var b = e.target.closest('.foto-item');
          if (b) abrirVisor(fotos, Number(b.dataset.i), b);
        });
      }).catch(noEncontrado);
    }
  }
})();
