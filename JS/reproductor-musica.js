
(() => {
    'use strict';

    const audio = document.getElementById('musica-audio');
    if (!audio) return;

    const pistas = [
        { nombre: 'Canción 1', archivo: '/asociados/canciones/Track1.mp3' },
        { nombre: 'Canción 2', archivo: '/asociados/canciones/Track2.mp3' },
        { nombre: 'Canción 3', archivo: '/asociados/canciones/Track3.mp3' },
        { nombre: 'Canción 4', archivo: '/asociados/canciones/Track4.mp3' },
        { nombre: 'Canción 5', archivo: '/asociados/canciones/Track5.mp3' }
    ];

    const playBtn = document.getElementById('musica-play');
    const nombre = document.getElementById('musica-nombre');
    const numero = document.getElementById('musica-numero');
    const seek = document.getElementById('musica-seek');
    const volumen = document.getElementById('musica-volumen');
    const tiempoActual = document.getElementById('musica-tiempo-actual');
    const duracion = document.getElementById('musica-duracion');
    const anteriorBtn = document.getElementById('musica-anterior');
    const siguienteBtn = document.getElementById('musica-siguiente');
    const botonesPista = [...document.querySelectorAll('.musica-pista')];

    if (!playBtn || !nombre || !numero || !seek || !volumen ||
        !tiempoActual || !duracion) return;

    const playIcon = playBtn.querySelector('i');
    let actual = 0;

    function formatoTiempo(segundos) {
        if (!Number.isFinite(segundos)) return '0:00';
        return `${Math.floor(segundos / 60)}:${Math.floor(segundos % 60)
            .toString().padStart(2, '0')}`;
    }

    function actualizarPista() {
        nombre.textContent = pistas[actual].nombre;
        numero.textContent = `CANCIÓN ${actual + 1} DE ${pistas.length}`;

        botonesPista.forEach((boton, indice) => {
            const activa = indice === actual;
            boton.classList.toggle('activa', activa);
            boton.setAttribute('aria-pressed', String(activa));

            const icono = boton.querySelector('i');
            if (icono) {
                icono.className = activa && !audio.paused
                    ? 'fas fa-volume-high'
                    : 'fas fa-play';
            }
        });
    }

    function actualizarBoton() {
        if (playIcon) {
            playIcon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
        }

        playBtn.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
        actualizarPista();
    }

    function cargarPista(indice, reproducir = false) {
        actual = (indice + pistas.length) % pistas.length;

        audio.pause();
        audio.src = pistas[actual].archivo;
        audio.load();

        seek.value = 0;
        tiempoActual.textContent = '0:00';
        duracion.textContent = '0:00';

        actualizarBoton();

        if (reproducir) {
            audio.play().then(actualizarBoton).catch(error => {
                console.error('No se pudo reproducir:', error);
            });
        }
    }

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            if (!audio.src) audio.src = pistas[actual].archivo;

            audio.play().then(actualizarBoton).catch(error => {
                console.error('Error al reproducir:', error);
            });
        } else {
            audio.pause();
            actualizarBoton();
        }
    });

    anteriorBtn?.addEventListener('click', () => cargarPista(actual - 1, true));
    siguienteBtn?.addEventListener('click', () => cargarPista(actual + 1, true));

    botonesPista.forEach(boton => {
        boton.addEventListener('click', () => {
            cargarPista(Number(boton.dataset.pista), true);
        });
    });

    volumen.addEventListener('input', () => {
        audio.volume = Number(volumen.value);
    });

    audio.volume = Number(volumen.value);

    audio.addEventListener('timeupdate', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            seek.value = (audio.currentTime / audio.duration) * 100;
            duracion.textContent = formatoTiempo(audio.duration);
        }

        tiempoActual.textContent = formatoTiempo(audio.currentTime);
    });

    seek.addEventListener('input', () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
            audio.currentTime = (Number(seek.value) / 100) * audio.duration;
        }
    });

    audio.addEventListener('play', actualizarBoton);
    audio.addEventListener('pause', actualizarBoton);

    audio.addEventListener('ended', () => {
        if (actual < pistas.length - 1) {
            cargarPista(actual + 1, true);
        } else {
            audio.currentTime = 0;
            actualizarBoton();
        }
    });

    audio.addEventListener('error', () => {
        nombre.textContent = 'No se pudo cargar el MP3. Revisá la ruta.';
        actualizarBoton();
        console.error('Error cargando:', pistas[actual].archivo, audio.error);
    });

    cargarPista(0, false);
})();
