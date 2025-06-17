// Lógica para dependencias de preguntas en guardar_punto.html
// Deshabilita preguntas dependientes hasta que la base esté respondida y las habilita dinámicamente

document.addEventListener('DOMContentLoaded', function() {
    // 1. Construir un mapa de dependencias: dependiente -> base
    const dependientes = Array.from(document.querySelectorAll('.question-item[data-pregunta-dependiente-id]'));
    const preguntasBase = {};
    dependientes.forEach(item => {
        const dependienteId = item.getAttribute('data-pregunta-id');
        const baseId = item.getAttribute('data-pregunta-dependiente-id');
        if (!preguntasBase[baseId]) preguntasBase[baseId] = [];
        preguntasBase[baseId].push(dependienteId);
    });

    // 2. Función para obtener el valor de respuesta de una pregunta base
    function getRespuestaPregunta(preguntaId) {
        // Busca el input principal de la pregunta base
        const item = document.querySelector('.question-item[data-pregunta-id="' + preguntaId + '"]');
        if (!item) return null;
        // --- MODIFICACIÓN: Si es tipo mapa, buscar los dos inputs hidden de lat/lng ---
        if (item.querySelector('.mapa-pregunta-mapa')) {
            const inputLat = item.querySelector('input[type="hidden"][id^="input_lat_"]');
            const inputLng = item.querySelector('input[type="hidden"][id^="input_lng_"]');
            if (inputLat && inputLng) {
                const lat = inputLat.value && inputLat.value.trim();
                const lng = inputLng.value && inputLng.value.trim();
                // Si ambos existen y son números válidos (caso punto)
                if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                    return lat + ',' + lng;
                }
                // Si lat es un JSON válido (caso línea/polígono)
                if (lat) {
                    try {
                        const arr = JSON.parse(lat);
                        if (Array.isArray(arr) && arr.length >= 2 && Array.isArray(arr[0]) && arr[0].length === 2) {
                            // Para línea: al menos 2 puntos, para polígono: al menos 3 puntos
                            if (arr.length >= 2) return lat;
                        }
                    } catch (e) {}
                }
                return '';
            }
        }
        // Buscar cualquier input relevante
        const input = item.querySelector('.question-input input:not([type=hidden]), .question-input select, .question-input textarea');
        if (!input) return null;
        if (input.type === 'checkbox' || input.type === 'radio') {
            // Si hay varios, buscar si alguno está checked
            const inputs = item.querySelectorAll('.question-input input[type="' + input.type + '"]');
            return Array.from(inputs).some(i => i.checked) ? 'checked' : '';
        } else {
            return input.value && input.value.trim() !== '' ? input.value : '';
        }
    }

    // 3. Deshabilitar dependientes al cargar y mostrar aviso
    dependientes.forEach(item => {
        const baseId = item.getAttribute('data-pregunta-dependiente-id');
        const baseRespondida = getRespuestaPregunta(baseId);
        const inputs = item.querySelectorAll('[data-dependiente="true"]');
        const aviso = item.querySelector('.dependencia-aviso');
        if (!baseRespondida) {
            inputs.forEach(inp => {
                inp.disabled = true;
                if (inp.type === 'checkbox' || inp.type === 'radio') inp.checked = false;
                else inp.value = '';
            });
            if (aviso) aviso.style.display = '';
        } else {
            if (aviso) aviso.style.display = 'none';
        }
    });

    // 4. Escuchar cambios en todas las preguntas base
    Object.keys(preguntasBase).forEach(baseId => {
        const item = document.querySelector('.question-item[data-pregunta-id="' + baseId + '"]');
        if (!item) return;
        // Escuchar en todos los inputs relevantes
        const inputs = item.querySelectorAll('.question-input input, .question-input select, .question-input textarea');
        inputs.forEach(inp => {
            inp.addEventListener('input', function() {
                const respondida = getRespuestaPregunta(baseId);
                preguntasBase[baseId].forEach(depId => {
                    const depItem = document.querySelector('.question-item[data-pregunta-id="' + depId + '"]');
                    if (!depItem) return;
                    const depInputs = depItem.querySelectorAll('[data-dependiente="true"]');
                    const aviso = depItem.querySelector('.dependencia-aviso');
                    if (respondida) {
                        depInputs.forEach(di => { di.disabled = false; });
                        if (aviso) aviso.style.display = 'none';
                    } else {
                        depInputs.forEach(di => {
                            di.disabled = true;
                            if (di.type === 'checkbox' || di.type === 'radio') di.checked = false;
                            else di.value = '';
                        });
                        if (aviso) aviso.style.display = '';
                    }
                });
            });
        });
    });
});
