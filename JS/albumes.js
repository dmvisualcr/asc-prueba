/* ALBUMES.JS — álbumes de fotos de la zona de asociados.
   - En multimedia.html: dibuja las tarjetas de álbumes (#albumes-grid).
   - En album.html: dibuja las fotos de un álbum (#fotos-grid) y el visor de pantalla completa.
   Los datos los genera scripts/generar_albumes.py (data/albumes.json y data/albumes/<álbum>.json). */
(function () {
  'use strict';

  var POR_TANDA = 60; // fotos que se muestran cada vez en un álbum

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ruta(r) { return encodeURI(r); }
  function leer(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(url);
      return r.json();
    });
  }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }

  /* ---------------- Lista de álbumes (multimedia.html) ---------------- */
  var grid = document.getElementById('albumes-grid');
  if (grid) {
    leer('data/albumes.json').then(function (d) {
      var lista = d.albumes || [];
      if (!lista.length) {
        grid.innerHTML = '<p class="empty-note">Pronto publicaremos aquí los álbumes de fotos.</p>';
        return;
      }
      grid.innerHTML = lista.map(function (a) {
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

  /* ---------------- Un álbum (album.html) ---------------- */
  var fotosGrid = document.getElementById('fotos-grid');
  if (!fotosGrid) return;

  var id = new URLSearchParams(location.search).get('a') || '';
  var titulo = document.getElementById('album-titulo');
  var lead = document.getElementById('album-lead');
  var masWrap = document.getElementById('fotos-mas');
  var fotos = [];
  var mostradas = 0;

  function mostrarMas() {
    var tanda = fotos.slice(mostradas, mostradas + POR_TANDA);
    fotosGrid.insertAdjacentHTML('beforeend', tanda.map(function (f, i) {
      var n = mostradas + i;
      return '<button type="button" class="foto-item" data-i="' + n + '" aria-label="Ver foto ' + (n + 1) + ' de ' + fotos.length + '">' +
        '<img src="' + esc(ruta(f.mini)) + '" alt="" loading="lazy" decoding="async"></button>';
    }).join(''));
    mostradas += tanda.length;
    masWrap.hidden = mostradas >= fotos.length;
  }

  if (!/^[a-z0-9-]+$/.test(id)) {
    fotosGrid.innerHTML = '<p class="empty-note">No encontramos ese álbum. <a href="multimedia.html">Volver a Multimedia</a></p>';
    return;
  }

  leer('data/albumes/' + id + '.json').then(function (d) {
    fotos = d.fotos || [];
    titulo.textContent = d.titulo;
    document.title = d.titulo + ' | Zona de asociados';
    lead.textContent = (d.descripcion ? d.descripcion + ' · ' : '') + plural(fotos.length, 'foto', 'fotos');
    fotosGrid.innerHTML = '';
    mostrarMas();
    masWrap.querySelector('button').addEventListener('click', mostrarMas);
    fotosGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.foto-item');
      if (b) abrirVisor(Number(b.dataset.i), b);
    });
  }).catch(function () {
    fotosGrid.innerHTML = '<p class="empty-note">No encontramos ese álbum. <a href="multimedia.html">Volver a Multimedia</a></p>';
  });

  /* ---------------- Visor de pantalla completa ---------------- */
  var visor = null, imagen, cuenta, actual = 0, origen = null, inicioX = null;

  function crearVisor() {
    visor = document.createElement('div');
    visor.className = 'visor';
    visor.hidden = true;
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-modal', 'true');
    visor.setAttribute('aria-label', 'Visor de fotos');
    visor.innerHTML =
      '<button type="button" class="visor-cerrar" aria-label="Cerrar"><i class="fas fa-xmark"></i></button>' +
      '<button type="button" class="visor-nav visor-prev" aria-label="Foto anterior"><i class="fas fa-chevron-left"></i></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="visor-nav visor-next" aria-label="Foto siguiente"><i class="fas fa-chevron-right"></i></button>';
    document.body.appendChild(visor);
    imagen = visor.querySelector('img');
    cuenta = visor.querySelector('figcaption');

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

  function mostrarFoto() {
    var f = fotos[actual];
    imagen.src = ruta(f.src);
    imagen.alt = 'Foto ' + (actual + 1) + ' de ' + fotos.length;
    cuenta.textContent = (actual + 1) + ' / ' + fotos.length;
    // precarga de las vecinas para que el cambio sea inmediato
    [actual - 1, actual + 1].forEach(function (i) { if (fotos[i]) new Image().src = ruta(fotos[i].src); });
  }

  function ir(paso) {
    actual = (actual + paso + fotos.length) % fotos.length;
    mostrarFoto();
  }

  function abrirVisor(i, desde) {
    if (!visor) crearVisor();
    origen = desde;
    actual = i;
    mostrarFoto();
    visor.hidden = false;
    document.body.style.overflow = 'hidden';
    visor.querySelector('.visor-cerrar').focus();
  }

  function cerrarVisor() {
    visor.hidden = true;
    imagen.removeAttribute('src');
    document.body.style.overflow = '';
    if (origen) origen.focus();
  }
})();
