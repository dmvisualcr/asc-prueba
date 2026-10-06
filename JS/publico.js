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
  var ORDEN_POS = ['Portero', 'Defensa', 'Medio', 'Delantero'];
  var ETIQUETA_POS = {
    Portero: 'Porteros', Defensa: 'Defensas', Medio: 'Mediocampistas', Delantero: 'Delanteros'
  };
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
    return fetch(BASE + 'data/' + archivo).then(function (r) {
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
      '<span class="player-number" aria-hidden="true">' + esc(j.numero) + '</span>' +
      '<img src="' + esc(ruta(j.foto)) + '" alt="' + esc(j.nombre) + '" loading="lazy">' +
      '<div class="player-info"><h3>' + esc(j.nombre) + '</h3><p>' + esc(j.posicion) + '</p></div>' +
      '</article>';
  }

  function tarjetaNoticia(n) {
    var externa = /^https?:\/\//.test(n.url);
    var destino = externa ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<div class="news-card news-card--ext">' +
      '<a class="news-img-link" href="' + esc(n.url) + '"' + destino + '>' +
        '<img src="' + esc(ruta(n.imagen)) + '" alt="' + esc(n.titulo) + '" loading="lazy">' +
      '</a>' +
      '<div class="news-info" data-fuente="' + esc(n.fuente) + '">' +
        '<p class="date">' + fecha(n.fecha) + '</p>' +
        '<h3><a href="' + esc(n.url) + '"' + destino + '>' + esc(n.titulo) + '</a></h3>' +
      '</div></div>';
  }

  /* ---------- Plantel ---------- */
  function iniciarPlantel() {
    var grid = document.getElementById('roster-grid');
    if (!grid) return;
    var filtros = document.getElementById('roster-filters');

    cargar('jugadores.json').then(function (datos) {
      var jugadores = (datos.jugadores || []).slice().sort(function (a, b) {
        return ORDEN_POS.indexOf(a.posicion) - ORDEN_POS.indexOf(b.posicion) || a.numero - b.numero;
      });

      function pintar(posicion) {
        var lista = posicion === 'Todos' ? jugadores
          : jugadores.filter(function (j) { return j.posicion === posicion; });
        grid.innerHTML = lista.length
          ? lista.map(tarjetaJugador).join('')
          : '<p class="empty-note">Aún no hay jugadores en esta posición.</p>';
        protegerImagenes(grid);
      }

      if (filtros) {
        var botones = ['Todos'].concat(ORDEN_POS).map(function (p) {
          var texto = p === 'Todos' ? 'Todos' : ETIQUETA_POS[p];
          return '<button type="button" class="filter-btn" data-pos="' + p + '" aria-pressed="' +
                 (p === 'Todos') + '">' + texto + '</button>';
        });
        filtros.innerHTML = botones.join('');
        filtros.addEventListener('click', function (e) {
          var btn = e.target.closest('.filter-btn');
          if (!btn) return;
          filtros.querySelectorAll('.filter-btn').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          pintar(btn.dataset.pos);
        });
      }
      pintar('Todos');
    }).catch(function () {
      grid.innerHTML = '<p class="empty-note">No se pudo cargar el plantel. Intentá de nuevo en unos minutos.</p>';
    });
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
  function iniciarNoticias() {
    var grid = document.getElementById('news-grid');
    if (!grid) return;
    var masWrap = document.getElementById('news-more');

    cargar('noticias.json').then(function (datos) {
      var lista = (datos.noticias || []).slice().sort(porFechaDesc);
      var mostradas = 0;

      function mostrarMas() {
        var tramo = lista.slice(mostradas, mostradas + NOTICIAS_POR_PAGINA);
        grid.insertAdjacentHTML('beforeend', tramo.map(tarjetaNoticia).join(''));
        mostradas += tramo.length;
        protegerImagenes(grid);
        if (masWrap) masWrap.hidden = mostradas >= lista.length;
      }

      if (!lista.length) {
        grid.innerHTML = '<p class="empty-note">Todavía no hay noticias publicadas.</p>';
        return;
      }
      mostrarMas();
      var btn = masWrap && masWrap.querySelector('button');
      if (btn) btn.addEventListener('click', mostrarMas);
    }).catch(function () {
      grid.innerHTML = '<p class="empty-note">No se pudieron cargar las noticias.</p>';
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
    iniciarCuerpoTecnico();
    iniciarNoticias();
    iniciarCalendario();
    iniciarTeaser();
  });
})();
