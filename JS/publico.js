/* ==========================================================================
   PUBLICO.JS — Dibuja el contenido público a partir de los archivos /data/*.json
   Cada página lo carga con:  <script src="…/JS/publico.js" data-base="…/"></script>
   donde data-base es la ruta hacia la raíz del sitio ("" en el index, "../" en paginicio/).
   Cada bloque se dibuja solo si encuentra su contenedor en la página.
   ========================================================================== */
(function () {
  'use strict';

  var BASE = (document.currentScript && document.currentScript.dataset.base) || '';
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
               'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var NOTICIAS_POR_PAGINA = 12;

  /* ---------- utilidades ---------- */
  function esc(valor) {
    return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fecha(iso) {
    var p = String(iso).split('-').map(Number);
    if (p.length !== 3 || isNaN(p[0])) return esc(iso);
    return p[2] + ' ' + MESES[p[1] - 1] + ', ' + p[0];
  }

  function cargar(archivo) {
    return fetch(BASE + 'data/' + archivo, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('No se pudo cargar ' + archivo);
      return r.json();
    });
  }

  function ruta(src) {
    return /^https?:\/\//.test(src) ? src : BASE + src;
  }

  // Si una foto no existe, se muestra el escudo atenuado
  function protegerImagenes(contenedor) {
    contenedor.querySelectorAll('img').forEach(function (img) {
      function sinFoto() {
        img.classList.add('sin-foto');
        img.src = BASE + 'IMG/Escudo.PNG';
      }
      img.addEventListener('error', sinFoto, { once: true });
      if (img.complete && img.naturalWidth === 0) sinFoto();
    });
  }

  function porFechaDesc(a, b) {
    return String(b.fecha).localeCompare(String(a.fecha));
  }

  /* ---------- plantillas ---------- */
  function tarjetaJugador(j) {
    return '<article class="player-card">' +
      '<img src="' + esc(ruta(j.foto)) + '" alt="' + esc(j.nombre) + '" loading="lazy">' +
      '<div class="player-info"><h3>' + esc(j.nombre) + '</h3><p>' + esc(j.posicion) + '</p></div>' +
      '</article>';
  }

  function urlExterna(u) { return /^https?:\/\//.test(u); }
  function destinoEnlace(u) { return urlExterna(u) ? ' target="_blank" rel="noopener noreferrer"' : ''; }
  function etiquetaNoticia(n) { return n.categoria || 'Otros medios'; }
  function enlaceWhatsApp(n) {
    var url = urlExterna(n.url) ? n.url : new URL(n.url, location.href).href;
    return 'https://wa.me/?text=' + encodeURIComponent(n.titulo + ' ' + url);
  }

  function tarjetaNoticia(n) {
    var d = destinoEnlace(n.url);
    return '<div class="news-card news-card--ext">' +
      '<a class="news-img-link" href="' + esc(n.url) + '"' + d + '>' +
        '<img src="' + esc(ruta(n.imagen)) + '" alt="" loading="lazy">' +
        '<span class="news-cat">' + esc(etiquetaNoticia(n)) + '</span>' +
      '</a>' +
      '<div class="news-info" data-fuente="' + esc(n.fuente || 'herediano.com') + '">' +
        '<p class="date">' + fecha(n.fecha) + '</p>' +
        '<h3><a href="' + esc(n.url) + '"' + d + '>' + esc(n.titulo) + '</a></h3>' +
      '</div>' +
      '<a class="news-share" href="' + esc(enlaceWhatsApp(n)) + '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp"><i class="fab fa-whatsapp"></i></a>' +
      '</div>';
  }

  function noticiaDestacada(n) {
    var d = destinoEnlace(n.url);
    return '<article class="news-feature">' +
      '<a class="news-feature-img" href="' + esc(n.url) + '"' + d + '>' +
        '<img src="' + esc(ruta(n.imagen)) + '" alt="">' +
      '</a>' +
      '<div class="news-feature-body">' +
        '<span class="news-cat">' + esc(etiquetaNoticia(n)) + '</span>' +
        '<h2><a href="' + esc(n.url) + '"' + d + '>' + esc(n.titulo) + '</a></h2>' +
        (n.resumen ? '<p class="news-excerpt">' + esc(n.resumen) + '</p>' : '') +
        '<p class="news-meta">' + fecha(n.fecha) + ' · Fuente: ' + esc(n.fuente || 'herediano.com') + '</p>' +
        '<div class="news-actions">' +
          '<a class="btn-gold" href="' + esc(n.url) + '"' + d + '>Leer nota</a>' +
          '<a class="news-share news-share--lg" href="' + esc(enlaceWhatsApp(n)) + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="fab fa-whatsapp"></i> Compartir</a>' +
        '</div>' +
      '</div></article>';
  }

  /* ---------- Equipo ---------- */
  function iniciarPlantel() {
    var grid = document.getElementById('roster-grid');
    if (!grid) return;

    cargar('jugadores.json').then(function (datos) {
      // Se muestran en el mismo orden en que están escritos en jugadores.json
      var jugadores = datos.jugadores || [];
      grid.innerHTML = jugadores.length
        ? jugadores.map(tarjetaJugador).join('')
        : '<p class="empty-note">Aún no hay jugadores cargados.</p>';
      protegerImagenes(grid);
    }).catch(function () {
      grid.innerHTML = '<p class="empty-note">No se pudo cargar el equipo. Intentá de nuevo en unos minutos.</p>';
    });
  }

  /* ---------- Equipo: carrusel "Momentos de gloria" (títulos) ---------- */
  function iniciarTrofeos() {
    var roster = document.getElementById('roster-grid');
    if (!roster || document.getElementById('trophies')) return;

    cargar('trofeos.json').then(function (datos) {
      // Del más antiguo al más reciente (dentro de un mismo año se respeta el orden del JSON)
      var lista = (datos.trofeos || []).slice().sort(function (a, b) { return (a.anio || 0) - (b.anio || 0); });
      if (!lista.length) return; // sin datos no se muestra una franja vacía

      function decada(t) { return Math.floor((t.anio || 0) / 10) * 10; }
      var decadas = [];
      lista.forEach(function (t) { if (decadas.indexOf(decada(t)) === -1) decadas.push(decada(t)); });

      var sec = document.createElement('section');
      sec.id = 'trophies';
      sec.className = 'glory-section';
      sec.setAttribute('aria-labelledby', 'glory-title');
      sec.innerHTML =
        '<div class="glory-head">' +
          '<span class="subtitle">Palmarés</span>' +
          '<h2 id="glory-title">Momentos de gloria</h2>' +
        '</div>' +
        (decadas.length > 1
          ? '<div class="glory-decades" role="group" aria-label="Ir a una década">' +
              decadas.map(function (d) {
                return '<button type="button" class="glory-chip" data-decada="' + d + '" aria-pressed="false">' + d + 's</button>';
              }).join('') +
            '</div>'
          : '') +
        '<div class="glory-carousel">' +
          '<button type="button" class="glory-nav glory-prev" aria-label="Ver anteriores"><i class="fas fa-chevron-left"></i></button>' +
          '<div class="glory-track" tabindex="0" role="region" aria-label="Títulos del club">' +
            lista.map(function (t) {
              var etiqueta = t.etiqueta || t.anio;
              return '<figure class="glory-card" data-decada="' + decada(t) + '">' +
                '<img src="' + esc(encodeURI(ruta(t.imagen))) + '" alt="' + esc(etiqueta + ' · ' + t.titulo) + '" loading="lazy">' +
                '<figcaption><span class="glory-year">' + esc(etiqueta) + '</span>' +
                '<span class="glory-name">' + esc(t.titulo) + '</span></figcaption></figure>';
            }).join('') +
          '</div>' +
          '<button type="button" class="glory-nav glory-next" aria-label="Ver siguientes"><i class="fas fa-chevron-right"></i></button>' +
        '</div>';

      var seccionEquipo = roster.closest('section') || roster.parentElement;
      seccionEquipo.insertAdjacentElement('afterend', sec);
      protegerImagenes(sec);

      var pista = sec.querySelector('.glory-track');
      var prev = sec.querySelector('.glory-prev');
      var next = sec.querySelector('.glory-next');
      var chips = [].slice.call(sec.querySelectorAll('.glory-chip'));
      var tarjetas = [].slice.call(pista.children);
      var suave = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

      function paso() { return Math.max(200, pista.clientWidth * 0.8); }
      function actualizar() {
        prev.disabled = pista.scrollLeft <= 4;
        next.disabled = pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4;
        // marca la década de la primera tarjeta visible
        var x = pista.scrollLeft + 10, activa = tarjetas[0];
        for (var i = 0; i < tarjetas.length; i++) {
          if (tarjetas[i].offsetLeft <= x) activa = tarjetas[i]; else break;
        }
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.decada === activa.dataset.decada)); });
      }

      prev.addEventListener('click', function () { pista.scrollBy({ left: -paso(), behavior: suave }); });
      next.addEventListener('click', function () { pista.scrollBy({ left: paso(), behavior: suave }); });
      pista.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); pista.scrollBy({ left: paso(), behavior: suave }); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); pista.scrollBy({ left: -paso(), behavior: suave }); }
      });
      chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          var destino = pista.querySelector('.glory-card[data-decada="' + chip.dataset.decada + '"]');
          if (destino) pista.scrollTo({ left: Math.max(0, destino.offsetLeft - 4), behavior: suave });
        });
      });
      var pendiente = false;
      pista.addEventListener('scroll', function () {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(function () { pendiente = false; actualizar(); });
      }, { passive: true });
      window.addEventListener('resize', actualizar);
      actualizar();
    }).catch(function () { /* si no carga, simplemente no se muestra la franja */ });
  }

  /* ---------- Cuerpo técnico ---------- */
  function iniciarCuerpoTecnico() {
    var dt = document.getElementById('coach-feature');
    var staff = document.getElementById('staff-grid');
    if (!dt && !staff) return;

    cargar('cuerpo-tecnico.json').then(function (datos) {
      var d = datos.director;
      if (dt && d) {
        dt.innerHTML =
          '<div class="coach-photo"><img src="' + esc(ruta(d.foto)) + '" alt="' + esc(d.nombre) + '"></div>' +
          '<div class="coach-info">' +
            '<p class="role">' + esc(d.cargo) + '</p>' +
            '<h2>' + esc(d.nombre) + '</h2>' +
            '<p class="bio">' + esc(d.bio) + '</p>' +
          '</div>';
        protegerImagenes(dt);
      }
      if (staff) {
        staff.innerHTML = (datos.staff || []).map(function (m) {
          return '<div class="member-card">' +
            '<img src="' + esc(ruta(m.foto)) + '" alt="' + esc(m.nombre) + '" loading="lazy">' +
            '<h3>' + esc(m.nombre) + '</h3><p>' + esc(m.cargo) + '</p></div>';
        }).join('');
        protegerImagenes(staff);
      }
    }).catch(function () {
      if (staff) staff.innerHTML = '<p class="empty-note">No se pudo cargar el cuerpo técnico.</p>';
    });
  }

  /* ---------- Noticias: página completa ---------- */
  var ORDEN_CATEGORIAS = ['Comunicados', 'Cantera', 'Crónicas', 'Refuerzos', 'Entradas', 'Femenino', 'Noticias', 'Otros medios'];

  function iniciarNoticias() {
    var grid = document.getElementById('news-grid');
    if (!grid) return;
    var masWrap = document.getElementById('news-more');
    var contenedor = grid.parentElement;

    // Si la página no trae estos contenedores, se crean encima de la cuadrícula
    function asegurar(id, clase) {
      var el = document.getElementById(id);
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.className = clase;
        contenedor.insertBefore(el, grid);
      }
      return el;
    }
    var cajaFiltros = asegurar('news-filters', 'news-filters');
    var cajaDestacada = asegurar('news-featured', 'news-featured');

    var vacio = { noticias: [] };
    Promise.all([
      cargar('noticias-club.json').catch(function () { return vacio; }), // se actualiza sola desde herediano.com
      cargar('noticias.json').catch(function () { return vacio; })       // las que agregás a mano (otros medios)
    ]).then(function (res) {
      var vistas = {};
      var todas = [].concat(res[0].noticias || [], res[1].noticias || []).filter(function (n) {
        if (!n || !n.url || vistas[n.url]) return false;
        vistas[n.url] = true;
        return true;
      }).sort(function (a, b) {
        return String(b.fecha_hora || b.fecha).localeCompare(String(a.fecha_hora || a.fecha));
      });

      if (!todas.length) {
        grid.innerHTML = '<p class="empty-note">Todavía no hay noticias publicadas.</p>';
        return;
      }

      var categoria = 'Todas';
      var resto = [];
      var mostradas = 0;

      function mostrarMas() {
        var tramo = resto.slice(mostradas, mostradas + NOTICIAS_POR_PAGINA);
        grid.insertAdjacentHTML('beforeend', tramo.map(tarjetaNoticia).join(''));
        mostradas += tramo.length;
        protegerImagenes(grid);
        if (masWrap) masWrap.hidden = mostradas >= resto.length;
      }

      function pintar() {
        var items = categoria === 'Todas' ? todas.slice()
          : todas.filter(function (n) { return etiquetaNoticia(n) === categoria; });
        var destacada = categoria === 'Todas' ? items.shift() : null;
        cajaDestacada.innerHTML = destacada ? noticiaDestacada(destacada) : '';
        protegerImagenes(cajaDestacada);
        grid.innerHTML = '';
        resto = items;
        mostradas = 0;
        if (masWrap) masWrap.hidden = true;
        mostrarMas();
      }

      // Botones de categoría (solo si hay más de una)
      var presentes = [];
      todas.forEach(function (n) {
        var c = etiquetaNoticia(n);
        if (presentes.indexOf(c) === -1) presentes.push(c);
      });
      presentes.sort(function (a, b) {
        var ia = ORDEN_CATEGORIAS.indexOf(a), ib = ORDEN_CATEGORIAS.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      if (presentes.length > 1) {
        cajaFiltros.innerHTML = ['Todas'].concat(presentes).map(function (c) {
          return '<button type="button" class="news-chip" data-cat="' + esc(c) + '" aria-pressed="' +
                 (c === 'Todas') + '">' + esc(c) + '</button>';
        }).join('');
        cajaFiltros.addEventListener('click', function (e) {
          var btn = e.target.closest('.news-chip');
          if (!btn) return;
          categoria = btn.dataset.cat;
          cajaFiltros.querySelectorAll('.news-chip').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          pintar();
        });
      }

      var btnMas = masWrap && masWrap.querySelector('button');
      if (btnMas) btnMas.addEventListener('click', mostrarMas);
      pintar();
    });
  }

  /* ---------- Inicio: calendario mensual de partidos ---------- */
  var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function dosDigitos(n) { return (n < 10 ? '0' : '') + n; }

  function hora12(hhmm) {
    var p = String(hhmm || '').split(':').map(Number);
    if (p.length < 2 || isNaN(p[0])) return '';
    var sufijo = p[0] >= 12 ? 'p. m.' : 'a. m.';
    var h = p[0] % 12 === 0 ? 12 : p[0] % 12;
    return h + ':' + dosDigitos(p[1]) + ' ' + sufijo;
  }

  function partesFecha(iso) {
    var p = String(iso).split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2], fecha: new Date(p[0], p[1] - 1, p[2]) };
  }

  function iniciarCalendario() {
    var grid = document.getElementById('cal-grid');
    var lista = document.getElementById('match-list');
    if (!grid || !lista) return;
    var titulo = document.getElementById('cal-title');
    var btnPrev = document.getElementById('cal-prev');
    var btnNext = document.getElementById('cal-next');

    cargar('partidos.json').then(function (datos) {
      var partidos = (datos.partidos || []).slice().sort(function (a, b) {
        return (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''));
      });

      var hoy = new Date();
      var hoyIso = hoy.getFullYear() + '-' + dosDigitos(hoy.getMonth() + 1) + '-' + dosDigitos(hoy.getDate());
      var anio = hoy.getFullYear();
      var mes = hoy.getMonth(); // 0-11
      var seleccion = null;

      function delMes() {
        var prefijo = anio + '-' + dosDigitos(mes + 1);
        return partidos.filter(function (p) { return String(p.fecha).indexOf(prefijo) === 0; });
      }

      function pintar() {
        var delMesLista = delMes();
        var porDia = {};
        delMesLista.forEach(function (p) { porDia[p.fecha] = p; });

        titulo.textContent = MESES[mes] + ' ' + anio;

        // Semana que empieza el lunes
        var desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
        var diasMes = new Date(anio, mes + 1, 0).getDate();
        var html = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(function (d) {
          return '<div class="cal-dow" aria-hidden="true">' + d + '</div>';
        }).join('');

        for (var v = 0; v < desfase; v++) html += '<span class="cal-day" aria-hidden="true"></span>';

        for (var d = 1; d <= diasMes; d++) {
          var iso = anio + '-' + dosDigitos(mes + 1) + '-' + dosDigitos(d);
          var partido = porDia[iso];
          var clases = 'cal-day' + (iso === hoyIso ? ' today' : '');
          if (partido) {
            var local = String(partido.condicion).toLowerCase() === 'local';
            clases += ' has-match ' + (local ? 'local' : 'visitante') + (iso === seleccion ? ' is-selected' : '');
            html += '<button type="button" class="' + clases + '" data-fecha="' + iso + '" aria-label="' +
                    d + ' de ' + MESES[mes] + ': partido contra ' + esc(partido.rival) + '">' + d + '</button>';
          } else {
            html += '<span class="cal-day' + (iso === hoyIso ? ' today' : '') + '">' + d + '</span>';
          }
        }
        grid.innerHTML = html;

        if (!delMesLista.length) {
          lista.innerHTML = '<p class="empty-note">No hay partidos programados en ' + MESES[mes].toLowerCase() + '.</p>';
          return;
        }

        lista.innerHTML = delMesLista.map(function (p) {
          var f = partesFecha(p.fecha);
          var local = String(p.condicion).toLowerCase() === 'local';
          var nombre = local ? 'C.S Herediano vs ' + esc(p.rival) : esc(p.rival) + ' vs C.S Herediano';
          var detalle = [hora12(p.hora), p.competencia, p.estadio].filter(Boolean).map(esc).join(' · ');
          var marcador = p.marcador ? '<span class="match-score">' + esc(p.marcador) + '</span>' : '';
          return '<article class="match-card ' + (local ? 'local' : 'visitante') +
                 (p.fecha === seleccion ? ' is-selected' : '') + '" data-fecha="' + esc(p.fecha) + '">' +
                 '<div class="match-date"><strong>' + f.d + '</strong><span>' + DIAS_CORTOS[f.fecha.getDay()] + '</span></div>' +
                 '<div class="match-main"><h3>' + nombre + '</h3><p>' + detalle + '</p></div>' +
                 '<div class="match-side">' + marcador + '<span class="match-tag">' + (local ? 'Local' : 'Visitante') + '</span></div>' +
                 '</article>';
        }).join('');
      }

      function cambiarMes(delta) {
        mes += delta;
        if (mes < 0) { mes = 11; anio--; }
        if (mes > 11) { mes = 0; anio++; }
        seleccion = null;
        pintar();
      }

      if (btnPrev) btnPrev.addEventListener('click', function () { cambiarMes(-1); });
      if (btnNext) btnNext.addEventListener('click', function () { cambiarMes(1); });

      // Tocar un día con partido resalta ese partido en la lista
      grid.addEventListener('click', function (e) {
        var dia = e.target.closest('.cal-day.has-match');
        if (!dia) return;
        seleccion = dia.dataset.fecha;
        pintar();
        var tarjeta = lista.querySelector('.match-card.is-selected');
        if (tarjeta && tarjeta.scrollIntoView) tarjeta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });

      pintar();
    }).catch(function () {
      lista.innerHTML = '<p class="empty-note">No se pudo cargar el calendario de partidos.</p>';
    });
  }

  /* ---------- Inicio: bloque plantel / cuerpo técnico ---------- */
  function iniciarTeaser() {
    var seccion = document.getElementById('club-teaser');
    if (!seccion) return;
    var cajaDT = document.getElementById('teaser-coach');
    var cajaJug = document.getElementById('teaser-players');

    Promise.all([cargar('cuerpo-tecnico.json'), cargar('jugadores.json')]).then(function (res) {
      var d = res[0].director;
      var destacados = (res[1].jugadores || []).filter(function (j) { return j.destacado; }).slice(0, 4);

      if (cajaDT && d) {
        cajaDT.innerHTML =
          '<img src="' + esc(ruta(d.foto)) + '" alt="' + esc(d.nombre) + '" loading="lazy">' +
          '<div class="teaser-caption"><h3>' + esc(d.nombre) + '</h3><p>' + esc(d.cargo) + '</p></div>';
        protegerImagenes(cajaDT);
      }
      if (cajaJug) {
        cajaJug.innerHTML = destacados.map(tarjetaJugador).join('');
        protegerImagenes(cajaJug);
      }
      seccion.hidden = false;
    }).catch(function () { /* la sección queda oculta si no hay datos */ });
  }

  document.addEventListener('DOMContentLoaded', function () {
    iniciarPlantel();
    iniciarTrofeos();
    iniciarCuerpoTecnico();
    iniciarNoticias();
    iniciarCalendario();
    iniciarTeaser();
  });
})();
