/* CARRUSELES.JS — carrusel de expresidentes de Multimedia (/asociados/multimedia.html).
   Funciona por sí solo: no depende de JS/script.js. Usa el mismo HTML y CSS que ya tenías
   (.presidents-history, .presidents-slides, .prev-btn-presidents, .next-btn-presidents). */
(function () {
  'use strict';

  function iniciar(raiz) {
    var pista = raiz.querySelector('.carousel-slides, .presidents-slides');
    if (!pista || !pista.children.length) return;
    var tarjetas = [].slice.call(pista.children);
    var anterior = raiz.querySelector('.prev-btn, .prev-btn-presidents');
    var siguiente = raiz.querySelector('.next-btn, .next-btn-presidents');
    var marco = pista.parentElement;
    var indice = 0;
    var reloj = null;
    var inicioX = null;
    var sinMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function medidas() {
  var ancho = tarjetas[0].getBoundingClientRect().width;
  var estilo = getComputedStyle(pista);
  var estiloTarjeta = getComputedStyle(tarjetas[0]);

  var margenIzq = parseFloat(estiloTarjeta.marginLeft) || 0;
  var margenDer = parseFloat(estiloTarjeta.marginRight) || 0;
  var hueco = parseFloat(estilo.columnGap || estilo.gap) || 0;

  var paso = ancho + margenIzq + margenDer + hueco;
  var anchoMarco = marco.getBoundingClientRect().width;

  var visibles = Math.max(
    1,
    Math.floor((anchoMarco + hueco) / paso)
  );

  return {
    paso: paso,
    max: Math.max(0, tarjetas.length - visibles)
  };
}


    function pintar() {
      var m = medidas();
      if (indice > m.max) indice = m.max;
      if (indice < 0) indice = 0;
      pista.style.transform = 'translateX(' + (-indice * m.paso) + 'px)';
      if (anterior) anterior.style.visibility = indice <= 0 ? 'hidden' : 'visible';
      if (siguiente) siguiente.style.visibility = indice >= m.max ? 'hidden' : 'visible';
    }

    function mover(delta, volverAlInicio) {
      var m = medidas();
      var nuevo = indice + delta;
      if (nuevo > m.max) nuevo = volverAlInicio ? 0 : m.max;
      if (nuevo < 0) nuevo = 0;
      indice = nuevo;
      pintar();
    }

    function parar() { clearInterval(reloj); }
    function arrancar() {
      parar();
      if (sinMovimiento) return; // quien pidió menos animaciones no ve avance automático
      reloj = setInterval(function () { mover(1, true); }, 5000);
    }

    if (siguiente) siguiente.addEventListener('click', function () { parar(); mover(1, false); arrancar(); });
    if (anterior) anterior.addEventListener('click', function () { parar(); mover(-1, false); arrancar(); });

    // Deslizar con el dedo en el celular
    marco.addEventListener('touchstart', function (e) { inicioX = e.changedTouches[0].clientX; }, { passive: true });
    marco.addEventListener('touchend', function (e) {
      if (inicioX == null) return;
      var dx = e.changedTouches[0].clientX - inicioX;
      inicioX = null;
      if (Math.abs(dx) > 40) { parar(); mover(dx < 0 ? 1 : -1, false); arrancar(); }
    }, { passive: true });

    raiz.addEventListener('mouseenter', parar);
    raiz.addEventListener('mouseleave', arrancar);
    window.addEventListener('resize', pintar);
    window.addEventListener('load', pintar); // las medidas pueden cambiar cuando terminan de cargar las fotos

    pintar();
    arrancar();
  }

  function todos() {
    [].slice.call(document.querySelectorAll('.presidents-history')).forEach(iniciar);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', todos);
  else todos();
})();
