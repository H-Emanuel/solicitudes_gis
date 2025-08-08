// Unifica la inicialización de mapas para preguntas tipo "mapa" (punto, línea, polígono)
// Usa Leaflet para puntos y Leaflet.draw para línea/polígono

function loadLeafletDraw(callback) {
    if (window.L && L.Control && L.Control.Draw) {
        callback();
        return;
    }
    // Cargar CSS
    if (!document.getElementById('leaflet-draw-css')) {
        var link = document.createElement('link');
        link.id = 'leaflet-draw-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
        document.head.appendChild(link);
    }
    // Cargar JS
    if (!document.getElementById('leaflet-draw-js')) {
        var script = document.createElement('script');
        script.id = 'leaflet-draw-js';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
        script.onload = callback;
        document.body.appendChild(script);
    } else {
        callback();
    }
}

function inicializarMapasPreguntasUnificado() {
    document.querySelectorAll('.mapa-pregunta-mapa').forEach(function(div) {
        if (!div.id) return;
        var preguntaId = div.id.replace('mapa_', '');
        var tipo = div.dataset.mapaTipo || 'punto'; // data-mapa-tipo en el DOM
        // Destruir instancia previa si existe
        if (div._leaflet_map && typeof div._leaflet_map.remove === 'function') {
            div._leaflet_map.remove();
            div._leaflet_map = null;
        }
        var map = L.map(div.id).setView([-33.0472, -71.6127], 13);
        div._leaflet_map = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // --- MODAL INFORMATIVO ---
        if (!document.getElementById('modal-ubicacion-info')) {
            var modal = document.createElement('div');
            modal.id = 'modal-ubicacion-info';
            modal.style.display = 'none';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.35)';
            modal.style.zIndex = '99999';
            modal.innerHTML = `
                <div style="background:#fff;padding:28px 24px;border-radius:12px;max-width:340px;margin:120px auto 0 auto;box-shadow:0 4px 24px rgba(0,0,0,0.13);text-align:center;position:relative;">
                    <span style='position:absolute;top:10px;right:18px;font-size:1.5em;cursor:pointer;' id='cerrar-modal-ubicacion'>&times;</span>
                    <i class="fa-solid fa-location-crosshairs" style="font-size:2.2em;color:#38b000;margin-bottom:10px;"></i>
                    <div style="font-size:1.1em;margin-bottom:10px;font-weight:600;">Recuerda activar la ubicación</div>
                    <div style="font-size:1em;color:#444;">Para usar esta función, asegúrate de que la ubicación esté activada en tu navegador y que hayas dado permiso.</div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('cerrar-modal-ubicacion').onclick = function() {
                modal.style.display = 'none';
            };
            modal.onclick = function(e) {
                if (e.target === modal) modal.style.display = 'none';
            };
        }
        function mostrarModalUbicacion() {
            var modal = document.getElementById('modal-ubicacion-info');
            if (modal) {
                modal.style.display = 'block';
            }
        }
        function esMovil() {
            return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
        }

        if (tipo === 'punto') {
            // Lógica simple: solo marcador
            var marker = null;
            function setCoords(lat, lng) {
                var latSpan = document.getElementById('lat_' + preguntaId);
                var lngSpan = document.getElementById('lng_' + preguntaId);
                var inputLat = document.getElementById('input_lat_' + preguntaId);
                var inputLng = document.getElementById('input_lng_' + preguntaId);
                if (latSpan) latSpan.textContent = lat.toFixed(6);
                if (lngSpan) lngSpan.textContent = lng.toFixed(6);
                if (inputLat) {
                    inputLat.value = lat;
                    inputLat.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (inputLng) {
                    inputLng.value = lng;
                    inputLng.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            map.on('click', function(e) {
                if (marker) map.removeLayer(marker);
                marker = L.marker(e.latlng).addTo(map);
                setCoords(e.latlng.lat, e.latlng.lng);
            });
            var geoBtn = document.getElementById('geolocate_' + preguntaId);
            if (geoBtn) {
                geoBtn.disabled = false;
                geoBtn.onclick = function() {
                    if (esMovil()) {
                        mostrarModalUbicacion();
                        setTimeout(function(){
                            document.getElementById('modal-ubicacion-info').style.display = 'none';
                            map.locate({setView: true, maxZoom: 16});
                        }, 1500);
                    } else {
                        map.locate({setView: true, maxZoom: 16});
                    }
                };
            }
            map.on('locationfound', function(e) {
                if (marker) map.removeLayer(marker);
                marker = L.marker(e.latlng).addTo(map);
                setCoords(e.latlng.lat, e.latlng.lng);
            });
            map.on('locationerror', function(e) {
                alert(e.message);
            });
        } else if (tipo === 'linea' || tipo === 'poligono') {
            // Lógica avanzada: Leaflet.draw
            var drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            var drawOptions = {
                marker: false,
                polyline: tipo === 'linea',
                polygon: tipo === 'poligono',
                circle: false,
                rectangle: false,
                circlemarker: false
            };
            var drawControl = new L.Control.Draw({
                draw: drawOptions,
                edit: { featureGroup: drawnItems, edit: false, remove: true }
            });
            map.addControl(drawControl);
            map.on(L.Draw.Event.CREATED, function (e) {
                drawnItems.clearLayers();
                var layer = e.layer;
                drawnItems.addLayer(layer);
                if (e.layerType === 'polyline') {
                    var latlngs = layer.getLatLngs();
                    var inputLat = document.getElementById('input_lat_' + preguntaId);
                    var inputLng = document.getElementById('input_lng_' + preguntaId);
                    if (inputLat) {
                        inputLat.value = JSON.stringify(latlngs.map(ll => [ll.lat, ll.lng]));
                        inputLat.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (inputLng) {
                        inputLng.value = '';
                        inputLng.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                } else if (e.layerType === 'polygon') {
                    var latlngs = layer.getLatLngs()[0];
                    var inputLat = document.getElementById('input_lat_' + preguntaId);
                    var inputLng = document.getElementById('input_lng_' + preguntaId);
                    if (inputLat) {
                        inputLat.value = JSON.stringify(latlngs.map(ll => [ll.lat, ll.lng]));
                        inputLat.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (inputLng) {
                        inputLng.value = '';
                        inputLng.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        }
        setTimeout(function() { map.invalidateSize(); }, 200);
    });
}

function ready(fn) {
    if (document.readyState != 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
}

ready(function(){
    // Detectar si alguna pregunta requiere draw
    var requiereDraw = false;
    document.querySelectorAll('.mapa-pregunta-mapa').forEach(function(div) {
        var tipo = div.dataset.mapaTipo || 'punto';
        if (tipo === 'linea' || tipo === 'poligono') requiereDraw = true;
    });
    if (requiereDraw) {
        loadLeafletDraw(inicializarMapasPreguntasUnificado);
    } else {
        inicializarMapasPreguntasUnificado();
    }
});
