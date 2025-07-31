(function() {
    const btnPrevisualizar = document.getElementById('previsualizar-formulario');
    if (btnPrevisualizar) {
        btnPrevisualizar.addEventListener('click', function() {
            // --- ARREGLO: sincronizar preguntas editadas locales antes de previsualizar ---
            if (window.sincronizarPreguntasEditadasDesdeDOM) {
                window.sincronizarPreguntasEditadasDesdeDOM();
            }
            // Obtener datos locales actuales
            const titulo = document.getElementById('titulo_formulario')?.value || document.querySelector('.form-title-container h1')?.textContent?.replace('Formulario: ','') || '';
            const subtitulo = document.getElementById('hidden_subtitulo_formulario')?.value || ''; // Obtener el HTML del input oculto
            // Obtener estilos actuales del header si la función está disponible
            let estilos;
            if (typeof window.getEstilosHeaderActual === 'function') {
                estilos = window.getEstilosHeaderActual();
            } else {
                estilos = typeof window.estilosPreguntaPreview !== 'undefined' ? window.estilosPreguntaPreview : {
                    titulo: { bold: false, italic: false, underline: false, color: '#000000', font: "'Inter',sans-serif", align: 'center' },
                    subtitulo: { bold: false, italic: false, underline: false, color: '#000000', font: "'Inter',sans-serif", align: 'center' }
                };
            }
            // Portada: buscar si hay imagen local (blob) o usar la actual
            let portadaSrc = null;
            if (window.portadaBlobPendiente) {
                portadaSrc = window.URL.createObjectURL(window.portadaBlobPendiente);
            } else {
                const portadaImg = document.querySelector('.form-header img.form-image');
                if (portadaImg) portadaSrc = portadaImg.src;
            }
            // Color de fondo
            const temaColor = document.getElementById('tema_color_input')?.value || '#e8e8e8';
            // Preguntas: obtener el orden visual real del DOM
            let preguntas = [];
            const items = document.querySelectorAll('.question-item[data-pregunta-id]:not([data-pregunta-id="boton-enviar"])');
            items.forEach(item => {
                const id = item.getAttribute('data-pregunta-id');
                const tipo = item.getAttribute('data-tipo');
                // --- EXTRACCIÓN CORRECTA DEL TEXTO DE LA PREGUNTA ---
                let texto = '';
                const questionTextEl = item.querySelector('.question-text');
                if (questionTextEl) {
                    // Si hay un span de obligatorio, solo toma el texto del nodo principal (sin el icono)
                    if (questionTextEl.childNodes.length > 0) {
                        // Si el primer nodo es texto, úsalo
                        if (questionTextEl.childNodes[0].nodeType === Node.TEXT_NODE) {
                            texto = questionTextEl.childNodes[0].textContent.trim();
                        } else {
                            texto = questionTextEl.textContent.trim();
                        }
                    } else {
                        texto = questionTextEl.textContent.trim();
                    }
                }
                const descripcion = item.querySelector('.question-description')?.textContent || '';
                const obligatorio = item.getAttribute('data-obligatorio') === 'true';
                let mostrar_como_radio = false;
                let permitir_multiple = false;
                let opciones = [];
                let rango_minimo = null, rango_maximo = null;
                if (tipo === 'opcion_multiple') {
                    if (item.hasAttribute('data-mostrar-como-radio')) {
                        const attr = item.getAttribute('data-mostrar-como-radio');
                        mostrar_como_radio = (attr === 'true' || attr === 'True' || attr === '1');
                    }
                    if (item.hasAttribute('data-permitir-multiple')) {
                        const attr = item.getAttribute('data-permitir-multiple');
                        permitir_multiple = (attr === 'true' || attr === 'True' || attr === '1');
                    }
                    opciones = Array.from(item.querySelectorAll('.opciones-list .checkbox-text, .radio-group .radio-text, .custom-select option')).map(el => el.textContent).filter(op => op && op !== 'Seleccione una opción');
                } else if (tipo === 'valoracion') {
                    const ratingBoxes = item.querySelectorAll('.rating-box');
                    if (ratingBoxes.length > 0) {
                        rango_minimo = parseInt(ratingBoxes[0].textContent);
                        rango_maximo = parseInt(ratingBoxes[ratingBoxes.length-1].textContent);
                    }
                }
                // Fecha
                let fecha_tipo = null;
                if (tipo === 'fecha') {
                    fecha_tipo = item.getAttribute('data-fecha-tipo') || 'envio';
                }
                // --- AÑADIR input_html PARA MUSTACHE ---
                const pregunta = { id, tipo, texto, descripcion, obligatorio, mostrar_como_radio, permitir_multiple, opciones, rango_minimo, rango_maximo, fecha_tipo };
                pregunta.input_html = renderInputPreview(pregunta);
                preguntas.push(pregunta);
            });
            // 2. Preguntas añadidas localmente que no están en el DOM (por si acaso)
            if (window.preguntasAñadidas) {
                window.preguntasAñadidas.forEach(p => {
                    if (!preguntas.some(q => q.id === p.id)) {
                        preguntas.push({
                            id: p.id,
                            tipo: p.tipo,
                            texto: p.texto,
                            descripcion: p.descripcion,
                            obligatorio: p.obligatorio,
                            input_html: renderInputPreview(p)
                        });
                    }
                });
            }
            // 3. Eliminar de la previsualización las preguntas eliminadas localmente
            if (window.preguntasEliminadas && Array.isArray(window.preguntasEliminadas)) {
                preguntas = preguntas.filter(p => !window.preguntasEliminadas.includes(String(p.id)));
            }
            // 2.5. Reemplazar preguntas por su versión editada local si existe en preguntasEditadas
            if (window.preguntasEditadas) {
                preguntas = preguntas.map(p => {
                    const editada = window.preguntasEditadas.find(e => e.id === p.id);
                    if (editada) {
                        // Mantener el input_html actualizado
                        return {
                            ...p,
                            ...editada,
                            input_html: renderInputPreview(editada)
                        };
                    }
                    return p;
                });
            }
            // DEBUG: Mostrar en consola todas las preguntas que se envían a la previsualización
            console.log('Preguntas enviadas a la previsualización:', preguntas);
            // Texto del botón enviar
            const textoBotonEnviar = document.getElementById('id_texto_boton_enviar')?.value || document.querySelector('.btn-enviar-formulario')?.textContent || 'Enviar';
            // Rutas CSS absolutas
            const static_css = '/static/css/agregar_pregunta.css';
            const static_guardar_punto_css = '/static/css/guardar_punto.css';
            // DEBUG: Mostrar solo los estilos enviados a Mustache
            console.log('Estilos enviados a Mustache:', estilos);
            // Renderizar Mustache
            const template = document.getElementById('preview-template').innerHTML;
            const html = window.Mustache.render(template, {
                titulo,
                subtitulo,
                estilos,
                portada: portadaSrc,
                tema_color: temaColor,
                preguntas,
                texto_boton_enviar: textoBotonEnviar,
                static_css,
                static_guardar_punto_css
            });
            // Abrir en nueva ventana
            const win = window.open('', '_blank');
            win.document.open();
            win.document.write(html);
            win.document.close();

            // --- NUEVO: Asegurar que Leaflet CSS y JS están cargados ---
            function ensureLeaflet(win) {
                return new Promise(resolve => {
                    // CSS
                    if (!win.document.querySelector('link[href*="leaflet.css"]')) {
                        const link = win.document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
                        win.document.head.appendChild(link);
                    }
                    // JS
                    if (!win.L) {
                        const script = win.document.createElement('script');
                        script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
                        script.onload = resolve;
                        win.document.body.appendChild(script);
                    } else {
                        resolve();
                    }
                });
            }

            // --- NUEVO: Inicializar mapas solo cuando Leaflet y el DOM estén listos ---
            function initPreviewMaps() {
                win.document.querySelectorAll('.mapa-pregunta-mapa').forEach(function(div) {
                    if (!div.id) return;
                    var preguntaId = div.id.replace('mapa_', '');
                    // --- FIX ROBUSTO: destruir instancia previa de mapa si existe ---
                    if (div._leaflet_map && typeof div._leaflet_map.remove === 'function') {
                        div._leaflet_map.remove();
                        div._leaflet_map = null;
                    }
                    if (win.L && win.L.DomUtil.get(div.id) && win.L.DomUtil.get(div.id)._leaflet_id) {
                        try {
                            win.L.DomUtil.get(div.id)._leaflet_id = null;
                            win.L.DomUtil.get(div.id).innerHTML = '';
                        } catch(e){}
                    }
                    if (div.dataset.mapaInicializado) return;
                    div.dataset.mapaInicializado = '1';
                    var map = win.L.map(div.id).setView([-33.0472, -71.6127], 13);
                    div._leaflet_map = map;
                    win.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors'
                    }).addTo(map);
                    var marker = null;
                    function setCoords(lat, lng) {
                        win.document.getElementById('lat_' + preguntaId).textContent = lat.toFixed(6);
                        win.document.getElementById('lng_' + preguntaId).textContent = lng.toFixed(6);
                    }
                    var geoBtn = win.document.getElementById('geolocate_' + preguntaId);
                    if (geoBtn) {
                        geoBtn.onclick = function() {
                            map.locate({setView: true, maxZoom: 16});
                        };
                    }
                    map.on('click', function(e) {
                        if (marker) map.removeLayer(marker);
                        marker = win.L.marker(e.latlng).addTo(map);
                        setCoords(e.latlng.lat, e.latlng.lng);
                    });
                    map.on('locationfound', function(e) {
                        if (marker) map.removeLayer(marker);
                        marker = win.L.marker(e.latlng).addTo(map);
                        setCoords(e.latlng.lat, e.latlng.lng);
                    });
                    map.on('locationerror', function(e) {
                        win.alert(e.message);
                    });
                    // --- MUY IMPORTANTE: Forzar invalidateSize tras un pequeño delay ---
                    setTimeout(function() {
                        map.invalidateSize();
                    }, 200);
                });
            }

            // --- Esperar a que Leaflet esté cargado y el DOM listo ---
            function waitForLeafletAndDOM(cb) {
                if (win.L && win.L.map && win.document.readyState === 'complete') {
                    cb();
                } else {
                    setTimeout(function(){ waitForLeafletAndDOM(cb); }, 80);
                }
            }

            ensureLeaflet(win).then(function() {
                waitForLeafletAndDOM(initPreviewMaps);
            });
        });
    } // <-- Cierra el if (btnPrevisualizar)

    // Renderiza el input simulado según el tipo de pregunta (solo visual, sin funcionalidad)
    function renderOpcionMultiplePreview(p) {
        // p: pregunta (de tipo opcion_multiple)
        if (p.permitir_multiple) {
            // Checkbox
            return `<div class='opciones-container'><div class='opciones-list'>${(p.opciones||['Opción 1','Opción 2']).map((op,i)=>`<div class='opcion-item'><input type='checkbox' disabled class='checkbox-input'><label class='checkbox-label'><span class='checkbox-custom'></span><span class='checkbox-text'>${op}</span></label></div>`).join('')}</div></div>`;
        } else if (p.mostrar_como_radio) {
            // Radio
            return `<div class='radio-group'>${(p.opciones||['Opción 1','Opción 2']).map((op,i)=>`<label class='radio-label'><input type='radio' disabled class='radio-input'><span class='radio-custom'></span><span class='radio-text'>${op}</span></label>`).join('')}</div>`;
        } else {
            // Select normal
            return `<select class='custom-select' disabled><option value='' disabled selected>Seleccione una opción</option>${(p.opciones||['Opción 1','Opción 2']).map(op=>`<option value='${op}'>${op}</option>`).join('')}</select>`;
        }
    }

    // Renderiza el input simulado según el tipo de pregunta (solo visual, sin funcionalidad)
    function renderInputPreview(p) {
        if (p.tipo === 'texto') {
            if (p.obligatorio) {
                return `<div class="input-obligatorio-wrapper" style="position:relative;display:inline-block;width:50%;">
                    <input type='text' class='text-input obligatorio-pregunta' disabled placeholder='Respuesta...' style='padding-right:38px;'>
                    <span class='obligatorio-icon input-inside' title='Obligatorio' style='position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:2;'><span class='obligatorio-circle'>!</span></span>
                </div>`;
            } else {
                return `<input type='text' class='text-input' disabled placeholder='Respuesta...'>`;
            }
        } else if (p.tipo === 'opcion_multiple') {
            // Usar la misma lógica que renderOpcionMultiplePreview
            if (p.permitir_multiple) {
                return `<div class='opciones-container'><div class='opciones-list'>${(p.opciones||['Opción 1','Opción 2']).map((op,i)=>`<div class='opcion-item'><input type='checkbox' disabled class='checkbox-input'><label class='checkbox-label'><span class='checkbox-custom'></span><span class='checkbox-text'>${op}</span></label></div>`).join('')}</div></div>`;
            } else if (p.mostrar_como_radio) {
                return `<div class='radio-group'>${(p.opciones||['Opción 1','Opción 2']).map((op,i)=>`<label class='radio-label'><input type='radio' disabled class='radio-input'><span class='radio-custom'></span><span class='radio-text'>${op}</span></label>`).join('')}</div>`;
            } else {
                return `<select class='custom-select' disabled><option value='' disabled selected>Seleccione una opción</option>${(p.opciones||['Opción 1','Opción 2']).map(op=>`<option value='${op}'>${op}</option>`).join('')}</select>`;
            }
        } else if (p.tipo === 'valoracion') {
            const min = parseInt(p.rango_minimo) || 1;
            const max = parseInt(p.rango_maximo) || 5;
            let html = "<div class='rating-container'>";
            for (let i = min; i <= max; i++) {
                html += `<label class='rating-label'><input type='radio' disabled class='radio-input'><span class='rating-box'>${i}</span></label>`;
            }
            html += '</div>';
            return html;
        } else if (p.tipo === 'verdadero_falso') {
            return `<div class='radio-group'><label class='radio-label'><input type='radio' disabled class='radio-input'><span class='radio-custom'></span><span class='radio-text'>Verdadero</span></label><label class='radio-label'><input type='radio' disabled class='radio-input'><span class='radio-custom'></span><span class='radio-text'>Falso</span></label></div>`;
        } else if (p.tipo === 'foto') {
            return `<div class='file-input-container enhanced-file-input' data-pregunta-id='${p.id}'>
        <div class='file-input-row'>
            <input type='file' disabled class='file-input'>
            <label class='file-label drop-area custom-file-btn'>
                <i class='fas fa-upload'></i>
                <span class='file-label-text'>Arrastra o selecciona una imagen</span>
            </label>
        </div>
        <div class='file-preview' style='display:none'>
            <img class='file-thumb' src='' alt='preview'>
            <span class='file-info'></span>
            <span class='file-size'></span>
            <div class='file-menu'>
                <button type='button' class='file-menu-btn'><i class='fas fa-ellipsis-v'></i></button>
                <div class='file-menu-dropdown'>
                    <button type='button' class='file-rename'>Renombrar</button>
                    <button type='button' class='file-delete'>Eliminar</button>
                    <button type='button' class='file-download'>Descargar</button>
                </div>
            </div>
        </div>
    </div>`;
        } else if (p.tipo === 'mapa') {
            return `
                <div class="mapa-pregunta-container" style="margin-bottom: 16px;">
                    <div id="mapa_${p.id}" class="mapa-pregunta-mapa" style="width:100%;height:250px;margin-bottom:10px;"></div>
                    <div class="mapa-coords-row" style="display:flex;gap:16px;align-items:center;">
                        <div class="coords-labels" style="display:flex;gap:12px;align-items:center;">
                            <span><strong>Latitud:</strong> <span id="lat_${p.id}" class="mapa-lat-span">-</span></span>
                            <span><strong>Longitud:</strong> <span id="lng_${p.id}" class="mapa-lng-span">-</span></span>
                        </div>
                        <button type="button" class="btn" id="geolocate_${p.id}" style="height:38px;" disabled>Usar mi ubicación</button>
                    </div>
                </div>
            `;
        } else if (p.tipo === 'fecha') {
            // Mostrar el input correcto según el valor de fecha_tipo
            if (p.fecha_tipo === 'envio') {
                const hoy = new Date();
                const yyyy = hoy.getFullYear();
                const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                const dd = String(hoy.getDate()).padStart(2, '0');
                const fechaActual = `${yyyy}-${mm}-${dd}`;
                return `<div style="position:relative;width:50%;display:inline-block;">
                    <input type="text" value="(se registrará la fecha de envío)" class="text-input" readonly disabled>
                    <input type="hidden" name="respuesta_${p.id}" value="${fechaActual}">
                </div>`;
            } else if (p.fecha_tipo === 'usuario') {
                return `<input type="date" name="respuesta_${p.id}" class="text-input" disabled>`;
            } else {
                // fallback: mostrar input de fecha editable
                return `<input type="date" name="respuesta_${p.id}" class="text-input" disabled>`;
            }
        }
        return '';
    }
})();