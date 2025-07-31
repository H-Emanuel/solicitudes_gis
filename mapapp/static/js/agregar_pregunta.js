window.portadaBlobPendiente = null;
window.headerEditOpen = false;
window.preguntaSeleccionadaId = null;

// --- Elimina este bloque duplicado, ya que editarPregunta no está definida aquí ---
// document.getElementById('questions-preview')?.addEventListener('click', function(e) {
//     ...existing code...
// });

import { inicializarFormHeader, getEstilosHeaderActual } from './form_header.js';
import { initConfiguracionTab } from './configuracion.js';

document.addEventListener('DOMContentLoaded', function() {
    inicializarFormHeader();

    // Eliminar previews encima de los inputs si existen
    ['preview_nombre','preview_descripcion','preview_placeholder'].forEach(id=>{
        const el = document.getElementById(id);
        if(el) el.remove();
    });

    // Arrays para registrar cambios locales
window.preguntasEliminadas = window.preguntasEliminadas || [];
const preguntasEliminadas = window.preguntasEliminadas;
const preguntasEditadas = [];
const preguntasAñadidas = [];
// --- ARREGLO: asegurar que los arrays locales sean globales ---
window.preguntasEditadas = preguntasEditadas;
window.preguntasAñadidas = preguntasAñadidas;

    const questionTypeButtons = document.getElementById('question-type-buttons');
    const questionForm = document.getElementById('question-form');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const preguntaIdInput = document.getElementById('pregunta_id');
    const tipoInput = document.getElementById('id_tipo');
    const questionsPreview = document.getElementById('questions-preview');

    // Agregar event listeners iniciales
    agregarEventosBotones();

    // Función para crear una nueva pregunta
    function crearNuevaPregunta(tipo) {
        // --- RESTRICCIÓN: Solo una pregunta de tipo mapa por formulario ---
        if (tipo === 'mapa') {
            let existeMapa = false;
            document.querySelectorAll('.question-item').forEach(item => {
                const preguntaId = item.getAttribute('data-pregunta-id');
                const tipoPregunta = item.getAttribute('data-tipo');
                if (!preguntasEliminadas.includes(preguntaId) && tipoPregunta === 'mapa') {
                    existeMapa = true;
                }
            });
            if (!existeMapa) {
                existeMapa = preguntasAñadidas.some(p => p.tipo === 'mapa');
            }
            if (existeMapa) {
                mostrarMensajeFlotante('Solo puedes agregar una pregunta de tipo mapa por formulario. Si eliminaste la anterior, guarda el formulario para poder agregar otra.', 'error');
                return;
            }
        }
        const idTemporal = `tmp-${Date.now()}-${Math.floor(Math.random()*10000)}`;
        let opciones = [];
        if (tipo === 'opcion_multiple') {
            opciones = ['Opción 1'];
        }
        const nuevaPregunta = {
            id: idTemporal,
            texto: `Nueva pregunta de ${getTipoNombre(tipo)}`,
            tipo: tipo,
            mostrar_como_radio: false,
            permitir_multiple: false,
            obligatorio: false,
            descripcion: '',
            placeholder: tipo === 'texto' ? 'Escribe tu respuesta aquí' : '',
            opciones: opciones,
            rango_minimo: tipo === 'valoracion' ? 1 : null,
            rango_maximo: tipo === 'valoracion' ? 5 : null,
            ...(tipo === 'fecha' ? { fecha_tipo: 'envio' } : {})
        };
        preguntasAñadidas.push(nuevaPregunta);
        preguntaSeleccionadaId = idTemporal;

    // Renderizar la pregunta en el preview ANTES de mostrar el formulario
    renderPreguntasLocales(nuevaPregunta);

    // Cambiar a la pestaña Editar automáticamente
    const tabEditar = document.querySelector('.tab[data-tab="editar"]');
    if (tabEditar) tabEditar.click();

    // Mostrar el formulario de edición
    // --- FIX: Esperar a que el DOM esté actualizado antes de mostrar el formulario ---
    let intentosScroll = 0;
    function scrollToNuevaPregunta() {
        const el = document.querySelector(`.question-item[data-pregunta-id='${idTemporal}']`);
        if (el && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({behavior: 'smooth', block: 'center'});
            // Si el contenedor tiene scroll, también lo centramos
            const parent = el.closest('.questions-list, #questions-preview');
            if (parent && parent.scrollHeight > parent.clientHeight) {
                el.scrollIntoView({behavior: 'smooth', block: 'center'});
            }
        } else if (intentosScroll < 5) {
            intentosScroll++;
            setTimeout(scrollToNuevaPregunta, 100);
        }
    }
    setTimeout(() => {
        mostrarFormularioEdicion(nuevaPregunta);
        scrollToNuevaPregunta();
    }, 150);
    }

    // Función para obtener el nombre descriptivo del tipo de pregunta
    function getTipoNombre(tipo) {
        const tipos = {
            'texto': 'texto',
            'opcion_multiple': 'opción múltiple',
            'valoracion': 'valoración',
            'verdadero_falso': 'verdadero/falso',
            'foto': 'foto',
            'mapa': 'mapa',
            // NUEVO tipo
            'fecha': 'fecha'
        };
        return tipos[tipo] || tipo;
    }

    // Función para actualizar la vista previa
    function actualizarVistaPrevia() {
        const formularioId = window.FORMULARIO_ID;
        return fetch(`/actualizar_preguntas/?formulario_id=${formularioId}`)
            .then(response => response.text())
            .then(html => {
                questionsPreview.innerHTML = html;
                agregarEventosBotones();
                // Eliminar data-mapa-inicializado de todos los divs de mapa para forzar reinicialización
                document.querySelectorAll('.mapa-pregunta-mapa').forEach(div => {
                    div.removeAttribute('data-mapa-inicializado');
                });
                // Inicializar mapas de preguntas tipo 'mapa' de forma robusta
                function leafletCssLoaded() {
                    return !!Array.from(document.styleSheets).find(s => s.href && s.href.includes('leaflet'));
                }
                function tryInitMapasPreview(retries = 10) {
                    if (window.L && window.L.map && leafletCssLoaded()) {
                        if (window.inicializarMapasPreview) {
                            window.inicializarMapasPreview();
                            // Forzar invalidateSize en todos los mapas
                            document.querySelectorAll('.mapa-pregunta-mapa').forEach(function(div) {
                                if (div._leaflet_map && typeof div._leaflet_map.invalidateSize === 'function') {
                                    setTimeout(() => div._leaflet_map.invalidateSize(), 200);
                                }
                            });
                        }
                    } else if (retries > 0) {
                        setTimeout(() => tryInitMapasPreview(retries - 1), 150);
                    }
                }
                tryInitMapasPreview();
            });
    }

    // Función para agregar eventos a los botones de edición y eliminación
    function agregarEventosBotones() {
        // Remover event listeners existentes
        document.querySelectorAll('.delete-question-btn').forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });

        // Agregar nuevos event listeners
        document.querySelectorAll('.delete-question-btn').forEach(button => {
            button.addEventListener('click', function() {
                const preguntaId = this.getAttribute('data-id');
                eliminarPregunta(preguntaId);
            });
        });
    }

    // Función para editar una pregunta
    function editarPregunta(preguntaId) {
        if (!preguntaId) {
            // Si el id es null, undefined o vacío, no hacer nada
            return;
        }
        // Buscar primero en preguntasAñadidas (pregunta local)
        let pregunta = preguntasAñadidas.find(p => p.id == preguntaId);
        if (pregunta) {
            // Refuerzo: si es tipo mapa y no tiene mapa_tipo, buscar en preguntasEditadas o en el backend
            if (pregunta.tipo === 'mapa' && (typeof pregunta.mapa_tipo === 'undefined' || !pregunta.mapa_tipo)) {
                // Buscar en preguntasEditadas
                let editada = preguntasEditadas.find(p => p.id == preguntaId && p.mapa_tipo);
                if (editada) {
                    pregunta.mapa_tipo = editada.mapa_tipo;
                }
            }
            mostrarFormularioEdicion(pregunta);
            document.getElementById('id_descripcion').value = pregunta.descripcion || '';
            document.getElementById('id_placeholder').value = pregunta.placeholder || '';
            return;
        }
        // Luego buscar en preguntasEditadas
        pregunta = preguntasEditadas.find(p => p.id == preguntaId);
        if (pregunta) {
            // Refuerzo: si es tipo mapa y no tiene mapa_tipo, buscar en el backend
            if (pregunta.tipo === 'mapa' && (typeof pregunta.mapa_tipo === 'undefined' || !pregunta.mapa_tipo)) {
                fetch(`/obtener_pregunta/${preguntaId}/`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.tipo === 'mapa' && data.mapa_tipo) {
                            pregunta.mapa_tipo = data.mapa_tipo;
                        }
                        mostrarFormularioEdicion(pregunta);
                    });
                return;
            }
            mostrarFormularioEdicion(pregunta);
            document.getElementById('id_descripcion').value = pregunta.descripcion || '';
            document.getElementById('id_placeholder').value = pregunta.placeholder || '';
            return;
        }
        // Si no está en los arrays locales, cargar del backend
        fetch(`/obtener_pregunta/${preguntaId}/`)
            .then(response => response.json())
            .then(data => {
                // DEBUG: log para ver qué recibe el frontend
                if (data.tipo === 'mapa') {
                    console.log('[DEBUG FRONTEND] preguntaId:', preguntaId, 'mapa_tipo recibido:', data.mapa_tipo);
                }
                // Refuerzo: pasar el valor original de mapa_tipo explícitamente
                if (data.tipo === 'mapa') {
                    data.mapa_tipo_original = data.mapa_tipo;
                }
                questionTypeButtons.classList.add('hidden');
                // Seleccionar visualmente el item
                document.querySelectorAll('.question-item.selected').forEach(el => el.classList.remove('selected'));
                const item = document.querySelector(`.question-item[data-pregunta-id='${preguntaId}']`);
                if (item) item.classList.add('selected');
                preguntaSeleccionadaId = preguntaId;
                // Solo mostrar el formulario cuando los datos están listos
                mostrarFormularioEdicion(data);
                preguntaIdInput.value = preguntaId;
                tipoInput.value = data.tipo;
                document.getElementById('id_texto').value = data.texto;
                document.getElementById('id_descripcion').value = pregunta.descripcion || '';
                document.getElementById('id_placeholder').value = pregunta.placeholder || '';
                if (data.tipo === 'opcion_multiple') {
                    const opcionesContainer = document.getElementById('opciones-container');
                    opcionesContainer.innerHTML = '';
                    data.opciones.forEach(opcion => {
                        agregarOpcionInput(opcion);
                    });
                    const mostrarComoRadioCheckbox = document.getElementById('id_mostrar_como_radio');
                    const permitirMultipleCheckbox = document.getElementById('id_permitir_multiple');
                    mostrarComoRadioCheckbox.checked = data.mostrar_como_radio;
                    permitirMultipleCheckbox.checked = data.permitir_multiple;
                    permitirMultipleCheckbox.disabled = !data.mostrar_como_radio;
                    actualizarEstiloPermitirMultiple();
                } else if (data.tipo === 'valoracion') {
                    document.getElementById('id_rango_minimo').value = data.rango_minimo;
                    document.getElementById('id_rango_maximo').value = data.rango_maximo;
                }
                document.getElementById('id_obligatorio').checked = !!data.obligatorio;
                // Si es tipo mapa, guardar el mapa_tipo recibido
                if (data.tipo === 'mapa' && data.mapa_tipo) {
                    data.mapa_tipo = data.mapa_tipo;
                }
                let idx = preguntasEditadas.findIndex(p => p.id == preguntaId);
                if (idx === -1) {
                    preguntasEditadas.push({
                        id: preguntaId,
                        texto: data.texto,
                        tipo: data.tipo,
                        mostrar_como_radio: data.mostrar_como_radio,
                        permitir_multiple: data.permitir_multiple,
                        descripcion: data.descripcion,
                        placeholder: data.placeholder,
                        opciones: data.opciones || [],
                        rango_minimo: data.rango_minimo,
                        rango_maximo: data.rango_maximo,
                        obligatorio: !!data.obligatorio,
                        fecha_tipo: data.fecha_tipo,
                        mapa_tipo: data.mapa_tipo,
                        pregunta_dependiente: data.pregunta_dependiente ? String(data.pregunta_dependiente) : '' // <-- Asegura string
                    });
                } else {
                    preguntasEditadas[idx].obligatorio = !!data.obligatorio;
                    if (data.tipo === 'mapa' && data.mapa_tipo) {
                        preguntasEditadas[idx].mapa_tipo = data.mapa_tipo;
                    }
                    preguntasEditadas[idx].pregunta_dependiente = data.pregunta_dependiente ? String(data.pregunta_dependiente) : '';
                }
                renderPreguntasLocales(data);
                toggleFields();
            })
            .catch(error => {
                console.error('Error:', error);
                // Solo mostrar el alert si la pregunta no es local ni fue eliminada
                const existeLocal = preguntasAñadidas.some(p => p.id == preguntaId) || preguntasEditadas.some(p => p.id == preguntaId);
                if (!preguntaId.startsWith('tmp-') || existeLocal) {
                    alert('Error al cargar la pregunta');
                }
            });
    }

    // Asegurar que mostrarFormularioEdicion siempre cambia la vista correctamente
    function mostrarFormularioEdicion(pregunta) {
        // DEBUG: log para ver siempre el estado de mapa_tipo
        if (pregunta.tipo === 'mapa') {
            console.log('[DEBUG mostrarFormularioEdicion] pregunta.id:', pregunta.id, 'mapa_tipo:', pregunta.mapa_tipo);
        }
        // Restaurar todos los campos del formulario de edición
        const form = document.getElementById('question-form');
        if (form) {
            form.querySelectorAll('.form-group').forEach(g => g.style.display = '');
            // Restaurar el label original
            const textoGroup = form.querySelector('.form-group');
            if (textoGroup) {
                const label = textoGroup.querySelector('label');
                if (label) label.textContent = 'Texto de la pregunta:';
            }
            // Ocultar el grupo del botón enviar si existe
            const grupoBotonEnviar = document.getElementById('grupo-boton-enviar');
            if (grupoBotonEnviar) grupoBotonEnviar.style.display = 'none';
        }
        // Activar la pestaña "Editar" visualmente
        const tabEditar = document.querySelector('.tab[data-tab="editar"]');
        if (tabEditar) {
            // Quitar clase active de todas las pestañas y contenidos
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tabEditar.classList.add('active');
            const tabId = tabEditar.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');
        }
        questionTypeButtons.classList.add('hidden');
        mostrarEstadoEdicionPregunta(pregunta);
        preguntaIdInput.value = pregunta.id;
        tipoInput.value = pregunta.tipo;
        document.getElementById('id_texto').value = pregunta.texto;
        document.getElementById('id_descripcion').value = pregunta.descripcion || '';
        document.getElementById('id_placeholder').value = pregunta.placeholder || '';
        if (pregunta.tipo === 'opcion_multiple') {
            const opcionesContainer = document.getElementById('opciones-container');
            opcionesContainer.innerHTML = '';
            (pregunta.opciones || []).forEach(opcion => agregarOpcionInput(opcion));
        } else if (pregunta.tipo === 'valoracion') {
            document.getElementById('id_rango_minimo').value = pregunta.rango_minimo;
            document.getElementById('id_rango_maximo').value = pregunta.rango_maximo;
        }
        document.getElementById('id_mostrar_como_radio').checked = !!pregunta.mostrar_como_radio;
        document.getElementById('id_permitir_multiple').checked = !!pregunta.permitir_multiple;
        document.getElementById('id_obligatorio').checked = !!pregunta.obligatorio;
        // Sincronizar el select de dependiente SOLO al editar (no al crear)
        const selectDependiente = document.getElementById('id_pregunta_dependiente');
        if (selectDependiente && !String(pregunta.id).startsWith('tmp-') && pregunta.id !== 'boton-enviar') {
            // Guardar valor actual
            const valorSeleccionado = pregunta.pregunta_dependiente ? String(pregunta.pregunta_dependiente) : '';
            // Limpiar opciones
            selectDependiente.innerHTML = '';
            // Opción por defecto
            const optNinguna = document.createElement('option');
            optNinguna.value = '';
            optNinguna.textContent = 'Ninguna';
            selectDependiente.appendChild(optNinguna);
            // Solo preguntas ya renderizadas en el DOM, excluyendo la actual, eliminadas y el botón enviar
            document.querySelectorAll('.question-item[data-pregunta-id]').forEach(item => {
                const id = item.getAttribute('data-pregunta-id');
                const texto = item.querySelector('.question-text')?.textContent?.trim() || id;
                if (id && id !== String(pregunta.id) && id !== 'boton-enviar' && !window.preguntasEliminadas.includes(id)) {
                    const opt = document.createElement('option');
                    opt.value = id;
                    opt.textContent = texto.length > 50 ? texto.slice(0, 50) + '…' : texto;
                    if (id === valorSeleccionado) opt.selected = true;
                    selectDependiente.appendChild(opt);
                }
            });
        }
        toggleFields();
        agregarListenersEdicionPregunta();
        // Refuerzo: volver a marcar el radio correcto tras toggleFields y listeners
        if (pregunta.tipo === 'mapa') {
            setTimeout(() => {
                const radios = document.querySelectorAll('input[name="mapa_tipo"]');
                radios.forEach(radio => {
                    radio.checked = (radio.value === pregunta.mapa_tipo);
                });
            }, 50);
        }
        // --- FECHA: Sincronizar radios existentes y su valor ---
        if (pregunta.tipo === 'fecha') {
            // Inicializar si no existe o si el valor es inválido
            if (pregunta.fecha_tipo !== 'envio' && pregunta.fecha_tipo !== 'usuario') {
                pregunta.fecha_tipo = 'envio';
            }
            sincronizarFechaTipoLocal(pregunta.id, pregunta.fecha_tipo);

            // --- Siempre reemplazar el contenido del grupo fecha por los botones tipo toggle ---
            const fechaGroup = document.getElementById('fecha_group');
            if (fechaGroup) {
                fechaGroup.style.display = '';
                fechaGroup.innerHTML = `
                    <label>Tipo de fecha:</label>
                    <div id="fecha_tipo_btns" style="display:flex;gap:12px;margin-top:8px;">
                        <button type="button" id="btn_fecha_envio" class="fecha-tipo-btn${pregunta.fecha_tipo === 'envio' ? ' active' : ''}">Fecha de envío</button>
                        <button type="button" id="btn_fecha_usuario" class="fecha-tipo-btn${pregunta.fecha_tipo === 'usuario' ? ' active' : ''}">Fecha especificada</button>
                    </div>
                `;
                // --- Selección visual inmediata al crear los botones ---
                setTimeout(() => {
                    const btnEnvio = document.getElementById('btn_fecha_envio');
                    const btnUsuario = document.getElementById('btn_fecha_usuario');
                    if (btnEnvio && btnUsuario) {
                        if (pregunta.fecha_tipo === 'envio') {
                            btnEnvio.classList.add('active');
                            btnUsuario.classList.remove('active');
                        } else {
                            btnUsuario.classList.add('active');
                            btnEnvio.classList.remove('active');
                        }
                    }
                }, 0);

                const btnEnvio = document.getElementById('btn_fecha_envio');
                const btnUsuario = document.getElementById('btn_fecha_usuario');
                btnEnvio.addEventListener('click', function() {
                    pregunta.fecha_tipo = 'envio';
                    sincronizarFechaTipoLocal(pregunta.id, 'envio');
                    btnEnvio.classList.add('active');
                    btnUsuario.classList.remove('active');
                    renderPreguntasLocales(pregunta);
                });
                btnUsuario.addEventListener('click', function() {
                    pregunta.fecha_tipo = 'usuario';
                    sincronizarFechaTipoLocal(pregunta.id, 'usuario');
                    btnUsuario.classList.add('active');
                    btnEnvio.classList.remove('active');
                    renderPreguntasLocales(pregunta);
                });
            }
            renderPreguntasLocales(pregunta);
        }
        // --- MAPA: Sincronizar radios de tipo de selección (punto, línea, polígono) ---
        if (pregunta.tipo === 'mapa') {
            // Si el valor es undefined, intentar usar el valor original recibido (por ejemplo, de data.mapa_tipo)
            if (typeof pregunta.mapa_tipo === 'undefined' && typeof pregunta.mapa_tipo_original !== 'undefined') {
                pregunta.mapa_tipo = pregunta.mapa_tipo_original;
            }
            // Tomar el valor actualizado del array local si existe
            let arr = null;
            let idx = -1;
            if (pregunta.id && String(pregunta.id).startsWith('tmp-')) {
                arr = preguntasAñadidas;
                idx = arr.findIndex(p => p.id == pregunta.id);
            } else if (pregunta.id) {
                arr = preguntasEditadas;
                idx = arr.findIndex(p => p.id == pregunta.id);
            }
            let mapaTipoValor = (arr && idx !== -1 && arr[idx].mapa_tipo) ? arr[idx].mapa_tipo : pregunta.mapa_tipo;
            if (!['punto','linea','poligono'].includes(mapaTipoValor)) {
                mapaTipoValor = 'punto';
            }
            pregunta.mapa_tipo = mapaTipoValor;
            // --- Asegurar que el grupo de radios esté visible antes de marcar ---
            const mapaTipoGroup = document.getElementById('mapa_tipo_group');
            if (mapaTipoGroup) mapaTipoGroup.style.display = '';
            // --- Forzar checked del radio correcto tras un pequeño delay para asegurar renderizado ---
            setTimeout(() => {
                const radios = document.querySelectorAll('input[name="mapa_tipo"]');
                radios.forEach(radio => {
                    radio.checked = (radio.value === mapaTipoValor);
                });
            }, 0);
        }
        // Refuerzo: al abrir el panel de edición, sincronizar el valor de obligatorio en preguntasEditadas
        let arr = null;
        let idx = -1;
        if (pregunta.id && String(pregunta.id).startsWith('tmp-')) {
            arr = preguntasAñadidas;
            idx = arr.findIndex(p => p.id == pregunta.id);
        } else if (pregunta.id) {
            arr = preguntasEditadas;
            idx = arr.findIndex(p => p.id == pregunta.id);
        }
        if (arr && idx !== -1) {
            arr[idx].obligatorio = !!pregunta.obligatorio;
        }
        const cont = document.getElementById('mapa-pregunta-container');
        if (cont) cont.remove();
    }

    // === Actualización inmediata de la vista previa y del array local al editar pregunta ===
    function actualizarPreguntaEnEdicionYPreview() {
        const preguntaId = preguntaIdInput.value;
        if (!preguntaId) return;
        let arr = null;
        let idx = -1;
        if (preguntaId.startsWith('tmp-')) {
            arr = preguntasAñadidas;
            idx = arr.findIndex(p => p.id == preguntaId);
        } else {
            arr = preguntasEditadas;
            idx = arr.findIndex(p => p.id == preguntaId);
            if (idx === -1) {
                arr.push({
                    id: preguntaId,
                    texto: '',
                    tipo: tipoInput.value,
                    mostrar_como_radio: document.getElementById('id_mostrar_como_radio').checked,
                    permitir_multiple: document.getElementById('id_permitir_multiple').checked,
                    descripcion: '',
                    placeholder: '',
                    opciones: [],
                    rango_minimo: document.getElementById('id_rango_minimo').value,
                    rango_maximo: document.getElementById('id_rango_maximo').value,
                    obligatorio: document.getElementById('id_obligatorio').checked,
                    ...(tipoInput.value === 'fecha' ? { fecha_tipo: 'envio' } : {}),
                    ...(tipoInput.value === 'mapa' ? { mapa_tipo: 'punto' } : {})
                });
                idx = arr.length - 1;
            }
        }
        if (arr && idx !== -1) {
            arr[idx].texto = document.getElementById('id_texto').value;
            arr[idx].descripcion = document.getElementById('id_descripcion').value;
            arr[idx].placeholder = tipoInput.value === 'texto' ? document.getElementById('id_placeholder').value : '';
            arr[idx].obligatorio = document.getElementById('id_obligatorio').checked;
            arr[idx].mostrar_como_radio = document.getElementById('id_mostrar_como_radio').checked;
            arr[idx].permitir_multiple = document.getElementById('id_permitir_multiple').checked;
            if (tipoInput.value === 'opcion_multiple') {
                const inputs = document.querySelectorAll('#opciones-container .opcion-input');
                arr[idx].opciones = Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
            }
            if (tipoInput.value === 'valoracion') {
                arr[idx].rango_minimo = document.getElementById('id_rango_minimo').value;
                arr[idx].rango_maximo = document.getElementById('id_rango_maximo').value;
            }
            // Guardar el valor real de fecha_tipo
            if (tipoInput.value === 'fecha') {
                const btnEnvio = document.getElementById('btn_fecha_envio');
                const btnUsuario = document.getElementById('btn_fecha_usuario');
                if (btnEnvio && btnUsuario) {
                    arr[idx].fecha_tipo = btnUsuario.classList.contains('active') ? 'usuario' : 'envio';
                } else {
                    arr[idx].fecha_tipo = arr[idx].fecha_tipo || 'envio';
                }
            }
            // NUEVO: Guardar el valor de mapa_tipo y asegurar que nunca sea undefined
            if (tipoInput.value === 'mapa') {
                const mapaTipoRadio = document.querySelector('input[name="mapa_tipo"]:checked');
                let mapaTipoValor = mapaTipoRadio ? mapaTipoRadio.value : arr[idx].mapa_tipo;
                if (!['punto','linea','poligono'].includes(mapaTipoValor)) {
                    mapaTipoValor = 'punto';
                }
                arr[idx].mapa_tipo = mapaTipoValor;
            }
            arr[idx].pregunta_dependiente = document.getElementById('id_pregunta_dependiente')?.value || null;
        }
        // Evitar renderizar la vista previa completa en cada cambio si es tipo mapa
        if (arr && idx !== -1 && arr[idx].tipo === 'mapa') {
            // Solo actualizar el array local, pero actualiza nombre y descripción en el DOM
            const item = document.querySelector(`.question-item[data-pregunta-id='${preguntaId}']`);
            if (item) {
                const textoDiv = item.querySelector('.question-text');
                if (textoDiv && textoDiv.childNodes[0]) {
                    textoDiv.childNodes[0].textContent = arr[idx].texto;
                }
                let descripcionDiv = item.querySelector('.question-description');
                if (!descripcionDiv && arr[idx].descripcion) {
                    // Si no existe y hay descripción, crearla
                    descripcionDiv = document.createElement('div');
                    descripcionDiv.className = 'question-description';
                    descripcionDiv.textContent = arr[idx].descripcion;
                    textoDiv.insertAdjacentElement('afterend', descripcionDiv);
                } else if (descripcionDiv) {
                    descripcionDiv.textContent = arr[idx].descripcion;
                    // Ocultar si está vacía
                    descripcionDiv.style.display = arr[idx].descripcion ? '' : 'none';
                }
            }
            return;
        }
        // Llamar a renderPreguntasLocales pasando la pregunta en edición
        renderPreguntasLocales(arr ? arr[idx] : null);
    }

    // Listeners para inputs de edición de pregunta (actualización inmediata)
    function agregarListenersEdicionPregunta() {
        [
            'id_texto','id_descripcion','id_placeholder','id_obligatorio',
            'id_mostrar_como_radio','id_permitir_multiple',
            'id_rango_minimo','id_rango_maximo',
            'id_pregunta_dependiente' // NUEVO: listener para dependiente
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.removeEventListener('input', actualizarPreguntaEnEdicionYPreview);
                el.removeEventListener('change', actualizarPreguntaEnEdicionYPreview);
                el.addEventListener('input', actualizarPreguntaEnEdicionYPreview);
                el.addEventListener('change', actualizarPreguntaEnEdicionYPreview);
            }
        });
        const mapaTipoRadios = document.querySelectorAll('input[name="mapa_tipo"]');
        mapaTipoRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                sincronizarMapaTipoLocal(preguntaIdInput.value, this.value);
                actualizarPreguntaEnEdicionYPreview();
            });
        });
    }

    // Llama también al cargar la página por si hay un formulario visible
    agregarListenersEdicionPregunta();

    // Función para actualizar el estilo del checkbox permitir_multiple
    function actualizarEstiloPermitirMultiple() {
        const permitirMultipleCheckbox = document.getElementById('id_permitir_multiple');
        const mostrarComoRadioCheckbox = document.getElementById('id_mostrar_como_radio');
        
        if (permitirMultipleCheckbox.disabled) {
            permitirMultipleCheckbox.parentElement.style.opacity = '0.5';
            permitirMultipleCheckbox.parentElement.style.cursor = 'not-allowed';
        } else {
            permitirMultipleCheckbox.parentElement.style.opacity = '1';
            permitirMultipleCheckbox.parentElement.style.cursor = 'pointer';
        }
    }

    // Agregar evento para el checkbox mostrar_como_radio
    document.getElementById('id_mostrar_como_radio').addEventListener('change', function() {
        const permitirMultipleCheckbox = document.getElementById('id_permitir_multiple');
        permitirMultipleCheckbox.disabled = !this.checked;
        if (!this.checked) {
            permitirMultipleCheckbox.checked = false;
        }
        actualizarEstiloPermitirMultiple();
    });

    // Mensaje flotante para éxito, error o info
    function mostrarMensajeFlotante(texto, tipo = 'success') {
        let mensaje = document.createElement('div');
        mensaje.className = 'floating-success-message';
        if (tipo === 'error') mensaje.classList.add('floating-error-message');
        if (tipo === 'info') mensaje.classList.add('floating-info-message');
        mensaje.innerHTML = `<i class='fa-solid fa-check-circle'></i> ${texto}`;
        document.body.appendChild(mensaje);
        setTimeout(() => { mensaje.remove(); }, 3000);
    }

    // Modificar el manejador del formulario para guardar edición solo localmente y actualizar la vista previa
    questionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const preguntaId = preguntaIdInput.value;
        const mostrarComoRadio = document.getElementById('id_mostrar_como_radio').checked;
        const permitirMultiple = document.getElementById('id_permitir_multiple').checked;
        const descripcion = document.getElementById('id_descripcion').value;
        const placeholder = document.getElementById('id_placeholder').value;
        let opciones = [];
        if (tipoInput.value === 'opcion_multiple') {
            const inputs = document.querySelectorAll('#opciones-container .opcion-input');
            opciones = Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
        }
        // === NUEVO: Leer el valor actual de fecha_tipo si es pregunta de fecha ===
        let fecha_tipo = undefined;
        if (tipoInput.value === 'fecha') {
            // Buscar el botón activo
            const btnEnvio = document.getElementById('btn_fecha_envio');
            const btnUsuario = document.getElementById('btn_fecha_usuario');
            if (btnEnvio && btnEnvio.classList.contains('active')) {
                fecha_tipo = 'envio';
            } else if (btnUsuario && btnUsuario.classList.contains('active')) {
                fecha_tipo = 'usuario';
            } else {
                // fallback
                fecha_tipo = 'envio';
            }
        }
        // NUEVO: Leer el valor actual de mapa_tipo si es pregunta de mapa
        let mapa_tipo = undefined;
        if (tipoInput.value === 'mapa') {
            const mapaTipoRadio = document.querySelector('input[name="mapa_tipo"]:checked');
            mapa_tipo = mapaTipoRadio ? mapaTipoRadio.value : 'punto';
        }
        const editada = {
            id: preguntaId,
            texto: document.getElementById('id_texto').value,
            tipo: tipoInput.value,
            mostrar_como_radio: mostrarComoRadio,
            permitir_multiple: permitirMultiple,
            descripcion: descripcion,
            placeholder: tipoInput.value === 'texto' ? placeholder : '',
            opciones: opciones,
            rango_minimo: tipoInput.value === 'valoracion' ? document.getElementById('id_rango_minimo').value : null,
            rango_maximo: tipoInput.value === 'valoracion' ? document.getElementById('id_rango_maximo').value : null,
            estilos: getEstilosPreguntaPreview(), // Guardar los estilos actuales
            ...(tipoInput.value === 'fecha' ? { fecha_tipo: fecha_tipo } : {}),
            ...(tipoInput.value === 'mapa' ? { mapa_tipo: mapa_tipo } : {}),
            pregunta_dependiente: document.getElementById('id_pregunta_dependiente')?.value || null // <-- Asegura que se guarde siempre
        };
        if (preguntaId.startsWith('tmp-')) {
            const idx = preguntasAñadidas.findIndex(p => p.id == preguntaId);
            if (idx !== -1) preguntasAñadidas[idx] = editada;
        } else {
            const idx = preguntasEditadas.findIndex(p => p.id == preguntaId);
            if (idx !== -1) {
                preguntasEditadas[idx] = editada;
            } else {
                preguntasEditadas.push(editada);
            }
        }
        renderPreguntasLocales(); // <-- Asegurarse de que esto esté aquí para mostrar los cambios inmediatamente
    });

    // ========== MODAL DE CONFIRMACIÓN REUTILIZABLE ==========

    /**
     * Muestra un modal de confirmación bonito.
     * @param {string} mensaje - Mensaje a mostrar.
     * @param {string} [titulo] - Título opcional.
     * @param {string} [textoAceptar] - Texto del botón aceptar.
     * @param {string} [textoCancelar] - Texto del botón cancelar.
     * @returns {Promise<boolean>} - true si acepta, false si cancela.
     */
    function confirmarAccion(mensaje, titulo = "Confirmar acción", textoAceptar = "Aceptar", textoCancelar = "Cancelar") {
        return new Promise((resolve) => {
            // Si ya existe un modal, eliminarlo primero
            document.getElementById('modal-confirmacion')?.remove();

            // Crear el modal
            const modal = document.createElement('div');
            modal.id = 'modal-confirmacion';
            modal.className = 'modal visible';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:400px;text-align:center;">
                    <h2 style="margin-bottom:16px;font-size:1.3em;">${titulo}</h2>
                    <div style="margin-bottom:24px;font-size:1.1em;">${mensaje}</div>
                    <div style="display:flex;gap:16px;justify-content:center;">
                        <button type="button" id="btn-confirmar-aceptar" class="btn-submit" style="flex:1;">${textoAceptar}</button>
                        <button type="button" id="btn-confirmar-cancelar" class="btn-cancel" style="flex:1;color:#222;">${textoCancelar}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Focus en aceptar
            setTimeout(() => {
                document.getElementById('btn-confirmar-aceptar')?.focus();
            }, 10);

            // Cerrar modal y resolver
            function cerrar(res) {
                modal.classList.remove('visible');
                setTimeout(() => modal.remove(), 200);
                resolve(res);
            }
            document.getElementById('btn-confirmar-aceptar').onclick = () => cerrar(true);
            document.getElementById('btn-confirmar-cancelar').onclick = () => cerrar(false);

            // Cerrar con Escape
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') cerrar(false);
            });
            // Cerrar al hacer click fuera del contenido
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cerrar(false);
            });
        });
    }

    // Sobrescribir la función para eliminar pregunta
    async function eliminarPregunta(preguntaId) {
        // Confirmación antes de eliminar usando el nuevo modal
        const ok = await confirmarAccion('¿Estás seguro de que deseas eliminar esta pregunta?', 'Eliminar pregunta', 'Eliminar', 'Cancelar');
        if (!ok) return;
        if (preguntaId.startsWith('tmp-')) {
            const idx = preguntasAñadidas.findIndex(p => p.id == preguntaId);
            if (idx !== -1) preguntasAñadidas.splice(idx, 1);
        } else {
            if (!preguntasEliminadas.includes(preguntaId)) {
                preguntasEliminadas.push(preguntaId);
            }
        }
        // Mostrar mensaje flotante al eliminar una pregunta
        mostrarMensajeFlotante('Pregunta eliminada correctamente.', 'success');
        // Limpiar selección y cambiar a pestaña Agregar SIEMPRE tras eliminar
        limpiarSeleccion();
        preguntaSeleccionadaId = null;
        // Cambiar a la pestaña Agregar de forma robusta
        const tabAgregar = document.querySelector('.tab[data-tab="agregar"]');
        const tabEditar = document.querySelector('.tab[data-tab="editar"]');
        const tabContents = document.querySelectorAll('.tab-content');
        if (tabAgregar) {
            // Quitar clase active de todas las pestañas y contenidos
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tabAgregar.classList.add('active');
            document.getElementById('agregar-content').classList.add('active');
        }
        // Renderizar preguntas sin restaurar selección
        renderPreguntasLocales();
        // Forzar mensaje de no selección y ocultar formulario
        mostrarEstadoEdicionPregunta(null);
    }

    // Eventos para los botones de tipo de pregunta
    // CORRECTO:
    document.querySelectorAll('.question-type-btn').forEach(function(button) {
        button.addEventListener('click', function() {
            const type = button.getAttribute('data-type');
            crearNuevaPregunta(type);
        });
    });

    // Mostrar/ocultar el campo placeholder según el tipo
    function toggleFields() {
        const tipo = tipoInput.value;
        const opcionesGroup = document.getElementById('opciones_group');
        const mostrarComoRadioGroup = document.getElementById('mostrar_como_radio_group');
        const permitirMultipleGroup = document.getElementById('permitir_multiple_group');
        const rangoMinimoGroup = document.getElementById('rango_minimo_group');
        const rangoMaximoGroup = document.getElementById('rango_maximo_group');
        const placeholderGroup = document.getElementById('placeholder_group');
        const mapaGroup = document.getElementById('mapa_group');
        const mapaTipoGroup = document.getElementById('mapa_tipo_group');
        const fechaGroup = document.getElementById('fecha_group');

        if (tipo === 'opcion_multiple') {
            opcionesGroup.classList.remove('hidden');
            mostrarComoRadioGroup.classList.remove('hidden');
            permitirMultipleGroup.classList.remove('hidden');
            rangoMinimoGroup.classList.add('hidden');
            rangoMaximoGroup.classList.add('hidden');
            placeholderGroup.classList.add('hidden');
            if (mapaGroup) mapaGroup.style.display = 'none';
            if (mapaTipoGroup) mapaTipoGroup.style.display = 'none';
            if (fechaGroup) fechaGroup.style.display = 'none';
        } else if (tipo === 'valoracion') {
            opcionesGroup.classList.add('hidden');
            mostrarComoRadioGroup.classList.add('hidden');
            permitirMultipleGroup.classList.add('hidden');
            rangoMinimoGroup.classList.remove('hidden');
            rangoMaximoGroup.classList.remove('hidden');
            placeholderGroup.classList.add('hidden');
            if (mapaGroup) mapaGroup.style.display = 'none';
            if (mapaTipoGroup) mapaTipoGroup.style.display = 'none';
            if (fechaGroup) fechaGroup.style.display = 'none';
        } else if (tipo === 'texto') {
            opcionesGroup.classList.add('hidden');
            mostrarComoRadioGroup.classList.add('hidden');
            permitirMultipleGroup.classList.add('hidden');
            rangoMinimoGroup.classList.add('hidden');
            rangoMaximoGroup.classList.add('hidden');
            placeholderGroup.classList.remove('hidden');
            if (mapaGroup) mapaGroup.style.display = 'none';
            if (mapaTipoGroup) mapaTipoGroup.style.display = 'none';
            if (fechaGroup) fechaGroup.style.display = 'none';
        } else if (tipo === 'fecha') {
            if (fechaGroup) fechaGroup.style.display = '';
            opcionesGroup.classList.add('hidden');
            mostrarComoRadioGroup.classList.add('hidden');
            permitirMultipleGroup.classList.add('hidden');
            rangoMinimoGroup.classList.add('hidden');
            rangoMaximoGroup.classList.add('hidden');
            placeholderGroup.classList.add('hidden');
            if (mapaGroup) mapaGroup.style.display = 'none';
            if (mapaTipoGroup) mapaTipoGroup.style.display = 'none';
        } else if (tipo === 'mapa') {
            // Mostrar solo para tipo mapa
            opcionesGroup.classList.add('hidden');
            mostrarComoRadioGroup.classList.add('hidden');
            permitirMultipleGroup.classList.add('hidden');
            rangoMinimoGroup.classList.add('hidden');
            rangoMaximoGroup.classList.add('hidden');
            placeholderGroup.classList.add('hidden');
            if (mapaGroup) mapaGroup.style.display = '';
            if (mapaTipoGroup) mapaTipoGroup.style.display = '';
            if (fechaGroup) fechaGroup.style.display = 'none';
        } else {
            // Otros tipos
            opcionesGroup.classList.add('hidden');
            mostrarComoRadioGroup.classList.add('hidden');
            permitirMultipleGroup.classList.add('hidden');
            rangoMinimoGroup.classList.add('hidden');
            rangoMaximoGroup.classList.add('hidden');
            placeholderGroup.classList.add('hidden');
            if (mapaGroup) mapaGroup.style.display = 'none';
            if (mapaTipoGroup) mapaTipoGroup.style.display = 'none';
            if (fechaGroup) fechaGroup.style.display = 'none';
        }
        actualizarEstiloPermitirMultiple();
    }

    // Mejora: agregar opción dinámica sin eliminar las existentes y actualizar preview con debounce
    let debounceOpcionesTimeout = null;
    function agregarOpcionInput(valor = '') {
        const container = document.getElementById('opciones-container');
        const index = container.querySelectorAll('.opcion-input-group').length;
        const div = document.createElement('div');
        div.className = 'opcion-input-group';
        // Solo el primer input tiene el botón de agregar, los demás solo eliminar
        if (index === 0) {
            div.innerHTML = `
                <input type="text" class="opcion-input" placeholder="Escribe una opción" value="${valor}">
                <button type="button" class="add-opcion-btn"><i class="fa-solid fa-plus"></i></button>
            `;
        } else {
            div.innerHTML = `
                <input type="text" class="opcion-input" placeholder="Escribe una opción" value="${valor}">
                <button type="button" class="remove-opcion-btn"><i class="fa-solid fa-trash"></i></button>
            `;
        }
        container.appendChild(div);
        // Evento para agregar nueva opción solo en el primer input
        if (index === 0) {
            div.querySelector('.add-opcion-btn').addEventListener('click', function() {
                agregarOpcionInput();
                sincronizarOpcionesLocales();
            });
        } else {
            div.querySelector('.remove-opcion-btn').addEventListener('click', async function() {
                // Usar el modal de confirmación
                const ok = await confirmarAccion('¿Deseas eliminar esta opción?', 'Eliminar opción', 'Eliminar', 'Cancelar');
                if (ok) {
                    div.remove();
                    sincronizarOpcionesLocales();
                    setTimeout(() => {
                        const tabEditar = document.querySelector('.tab[data-tab="editar"]');
                        if (tabEditar && !tabEditar.classList.contains('active')) tabEditar.click();
                        const preguntaId = preguntaIdInput.value;
                        let pregunta = preguntasAñadidas.find(p => p.id == preguntaId) || preguntasEditadas.find(p => p.id == preguntaId);
                        if (pregunta) mostrarFormularioEdicion(pregunta);
                    }, 60);
                }
            });
        }
        div.querySelector('.opcion-input').addEventListener('input', function() {
            sincronizarOpcionesLocales();
        });
    }

    // Nueva función para sincronizar el array local de opciones y actualizar el preview
    function sincronizarOpcionesLocales() {
        const preguntaId = preguntaIdInput.value;
        let arr = null;
        let idx = -1;
        if (preguntaId && preguntaId.startsWith('tmp-')) {
            arr = preguntasAñadidas;
            idx = arr.findIndex(p => p.id == preguntaId);
        } else if (preguntaId) {
            arr = preguntasEditadas;
            idx = arr.findIndex(p => p.id == preguntaId);
        }
        if (arr && idx !== -1) {
            const container = document.getElementById('opciones-container');
            const inputs = container.querySelectorAll('.opcion-input');
            arr[idx].opciones = Array.from(inputs).map(input => input.value.trim()).filter(value => value !== '');
            clearTimeout(debounceOpcionesTimeout);
            debounceOpcionesTimeout = setTimeout(() => {
                renderPreguntasLocales(arr[idx]);
            }, 50);
        }
    }

    // Inicializar el formulario de creación
    toggleFields();
    agregarOpcionInput(); // Agregar solo una opción inicial


    // Manejo del formulario de actualización de información
    const formActualizarInfo = document.getElementById('form-actualizar-info');
    const imagePreview = document.getElementById('image-preview');

    if (formActualizarInfo) {
        formActualizarInfo.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            formData.append('actualizar_formulario', '1');

            fetch(this.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': window.CSRF_TOKEN
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Actualizar el título del formulario
                    document.querySelector('.questions-preview-container h1').textContent = `Formulario: ${data.nombre}`;
                    
                    // Actualizar la descripción si existe
                    const descriptionElement = document.querySelector('.form-description');
                    if (descriptionElement) {
                        descriptionElement.textContent = data.descripcion;
                    }
                    
                    // Actualizar la imagen si se subió una nueva
                    if (data.imagen_url) {
                        const formImage = document.querySelector('.form-image');
                        if (formImage) {
                            formImage.src = data.imagen_url;
                        } else {
                            // Si no existe la imagen, crear el contenedor
                            const formHeader = document.querySelector('.form-header');
                            const img = document.createElement('img');
                            img.src = data.imagen_url;
                            img.alt = 'Imagen del formulario';
                            img.className = 'form-image';
                            formHeader.insertBefore(img, formHeader.firstChild);
                        }
                    }
                    
                    // Mostrar mensaje de éxito
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.innerHTML = '<i class="fa-solid fa-check-circle"></i> Información actualizada correctamente';
                    document.querySelector('.questions-preview-container').insertBefore(successMessage, document.querySelector('.form-header'));
                    
                    // Eliminar el mensaje después de 3 segundos
                    setTimeout(() => {
                        successMessage.remove();
                    }, 3000);
                } else {
                    alert('Error al actualizar la información del formulario');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al actualizar la información del formulario');
            });
        });
    }

    // Manejo de la vista previa de la imagen
    const imageInput = document.getElementById('id_imagen');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.innerHTML = `
                        <img src="${e.target.result}" alt="Vista previa de la imagen">
                        <button type="button" id="cancel-image" class="cancel-image-btn">
                            <i class="fa-solid fa-trash"></i> Eliminar imagen
                        </button>
                    `;
                    // Agregar evento al nuevo botón de eliminar
                    document.getElementById('cancel-image').addEventListener('click', eliminarImagen);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Función para eliminar la imagen
    function eliminarImagen() {
        if (confirm('¿Estás seguro de que deseas eliminar la imagen actual?')) {
            fetch(`/eliminar_imagen_formulario/${window.FORMULARIO_ID}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': window.CSRF_TOKEN,
                },
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Limpiar el input de imagen
                    document.getElementById('id_imagen').value = '';
                    
                    // Actualizar la vista previa
                    imagePreview.innerHTML = '<p>No hay imagen seleccionada</p>';
                    
                    // Actualizar la imagen en el formulario
                    const formImage = document.querySelector('.form-image');
                    if (formImage) {
                        formImage.remove();
                    }
                    
                    // Mostrar mensaje de éxito
                    const successMessage = document.createElement('div');
                    successMessage.className = 'success-message';
                    successMessage.innerHTML = '<i class="fa-solid fa-check-circle"></i> Imagen eliminada correctamente';
                    document.querySelector('.questions-preview-container').insertBefore(successMessage, document.querySelector('.form-header'));
                    
                    // Eliminar el mensaje después de 3 segundos
                    setTimeout(() => {
                        successMessage.remove();
                    }, 3000);
                } else {
                    alert('Error al eliminar la imagen');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al eliminar la imagen');
            });
        }
    }

    // Agregar evento al botón de eliminar imagen inicial
    const cancelImageBtn = document.getElementById('cancel-image');
    if (cancelImageBtn) {
        cancelImageBtn.addEventListener('click', eliminarImagen);
    }

    // Manejo de pestañas independientes para Agregar, Editar y Apariencia
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover clase active de todas las pestañas y contenidos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Agregar clase active a la pestaña y contenido seleccionados
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-content`).classList.add('active');

            // Mostrar/ocultar secciones según la pestaña
            if (tabId === 'agregar') {
                document.getElementById('question-type-buttons').classList.remove('hidden');
                mostrarEstadoEdicionPregunta(null);
            } else if (tabId === 'editar') {
                // Si no hay pregunta seleccionada y el editor de header NO está abierto, mostrar el mensaje
                if (!preguntaSeleccionadaId && !window.headerEditOpen) {
                    mostrarEstadoEdicionPregunta(null);
                }
            } else {
                document.getElementById('question-type-buttons').classList.add('hidden');
                mostrarEstadoEdicionPregunta(null);
            }
        });
    });

    // Eliminar el evento del botón cancel-edit si no existe
    // (ya no es necesario, así que no hay error si no está)

    // ========== GUARDAR FORMULARIO (ahora solo con el botón Guardar) ==========
    document.getElementById('guardar-borrador').addEventListener('click', function() {
        if (!confirm('¿Estás seguro de que deseas guardar los cambios en el formulario?')) {
            return;
        }

        // Tomar los valores actuales de nombre, descripción y texto del botón enviar
        let nombreActual = document.getElementById('titulo_formulario')?.value || '';
        let descripcionActual = document.getElementById('subtitulo_formulario')?.value || '';
        // Si el valor es 'none', guardar como 'titulo' o 'subtitulo'
        if (nombreActual === 'none') nombreActual = 'titulo';
        if (descripcionActual === 'none') descripcionActual = 'subtitulo';
        // --- SINCRONIZAR el input oculto del botón enviar con el textarea si está visible ---
        const inputOculto = document.getElementById('id_texto_boton_enviar');
        const textareaBoton = document.getElementById('textarea-boton-enviar');
        if (inputOculto && textareaBoton && textareaBoton.offsetParent !== null) {
            inputOculto.value = textareaBoton.value;
        }
        const textoBotonEnviarActual = inputOculto?.value || 'Enviar';

        // --- SINCRONIZAR CAMPOS DEL FORMULARIO DE APARIENCIA ---
        // Esto asegura que los valores actuales estén en el form antes de crear el FormData
        const formActualizarInfo = document.getElementById('form-actualizar-info');
        if (formActualizarInfo) {
            const inputTitulo = formActualizarInfo.querySelector('[name="titulo"]');
            const inputSubtitulo = formActualizarInfo.querySelector('[name="subtitulo"]');
            const inputTemaColor = formActualizarInfo.querySelector('[name="tema_color"]');
            if (inputTitulo) inputTitulo.value = nombreActual;
            if (inputSubtitulo) inputSubtitulo.value = descripcionActual;
            if (inputTemaColor) inputTemaColor.value = document.getElementById('tema_color_input')?.value || '#e8e8e8';
        }

        // Obtener estilos del header desde el módulo
        const estilosHeader = getEstilosHeaderActual ? getEstilosHeaderActual() : {titulo:{},subtitulo:{}};

        const cambios = {
            eliminadas: preguntasEliminadas,
            editadas: preguntasEditadas.filter(p => p.id !== 'boton-enviar'),
            creadas: preguntasAñadidas.filter(p => p.id !== 'boton-enviar')
        };
        // Obtener el orden actual de las preguntas en el DOM
        const items = document.querySelectorAll('.questions-list .question-item');
        const orden_preguntas = Array.from(items).map(item => item.getAttribute('data-pregunta-id'));
        const formActualizarInfoElem = document.getElementById('form-actualizar-info');
        // Enviar el formulario como FormData (no JSON)
        const formData = new FormData(formActualizarInfoElem);
        formData.append('cambios', JSON.stringify(cambios));
        formData.append('formulario_id', window.FORMULARIO_ID);
        formData.append('orden_preguntas', JSON.stringify(orden_preguntas));
        formData.append('estilos_header', JSON.stringify(estilosHeader));
        // AÑADIR el texto del botón enviar actualizado
        formData.set('texto_boton_enviar', textoBotonEnviarActual);
        // AÑADIR nombre y descripción actuales
        formData.set('titulo', nombreActual); // <-- CORREGIDO: antes decía 'nombre'
        formData.set('subtitulo', descripcionActual);
        // AÑADIR el valor del switch de volver a contestar
        if (typeof window.FORMULARIO_PERMITIR_VOLVER !== 'undefined') {
            formData.set('permitir_volver_a_contestar', window.FORMULARIO_PERMITIR_VOLVER ? '1' : '0');
        }
        // Obtener el departamento seleccionado
        const inputDepartamento = document.getElementById('input-departamento-apariencia');
        if (inputDepartamento) {
            formData.set('departamento', inputDepartamento.value);
        }
        fetch('/guardar_cambios_formulario/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.CSRF_TOKEN
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                preguntasEliminadas.length = 0;
                preguntasEditadas.length = 0;
                preguntasAñadidas.length = 0;
                renderPreguntasLocales();
                mostrarMensajeFlotante('Formulario guardado exitosamente.');
            } else {
                alert('Error al guardar el formulario: ' + (data.error || data.message));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al guardar el formulario.');
        });
    });

    // Eliminar el evento duplicado de guardar formulario
    document.querySelectorAll('#guardar-formulario').forEach(btn => {
        if (btn !== document.getElementById('guardar-formulario')) {
            btn.remove();
        }
    });

    // Renderizado seguro: respeta el HTML original y solo oculta/actualiza/agrega preguntas locales
    function renderPreguntasLocales(preguntaEnEdicion = null) {
        // Protección: si no hay pregunta o no tiene id, salir
        if (preguntaEnEdicion && (!preguntaEnEdicion.id || typeof preguntaEnEdicion.id !== 'string')) {
            preguntaEnEdicion = null;
        }
        // Eliminar del DOM todas las preguntas eliminadas localmente
        if (Array.isArray(preguntasEliminadas) && preguntasEliminadas.length > 0) {
            preguntasEliminadas.forEach(function(id) {
                const item = document.querySelector(`.question-item[data-pregunta-id='${id}']`);
                if (item) item.remove();
            });
        }
        // Si hay pregunta en edición
        if (preguntaEnEdicion) {
            // Si es nueva (id temporal), actualizar en su posición original
            if (preguntaEnEdicion.id.startsWith('tmp-')) {
                const items = Array.from(questionsPreview.querySelectorAll('.question-item[data-pregunta-id^="tmp-"]'));
                const idx = preguntasAñadidas.findIndex(p => p.id === preguntaEnEdicion.id);
                if (idx !== -1) {
                    // Si ya existe en el DOM, reemplazarlo en la misma posición
                    let domItem = questionsPreview.querySelector(`.question-item[data-pregunta-id='${preguntaEnEdicion.id}']`);
                    const newDom = crearPreguntaPreviewDOM(preguntaEnEdicion, true);
                    if (domItem) {
                        questionsPreview.replaceChild(newDom, domItem);
                    } else {
                        // Insertar en la posición correcta según el array
                        let refNode = null;
                        // Buscar el siguiente item nueva en DOM
                        for (let i = idx + 1; i < preguntasAñadidas.length; i++) {
                            const nextDom = questionsPreview.querySelector(`.question-item[data-pregunta-id='${preguntasAñadidas[i].id}']`);
                            if (nextDom) { refNode = nextDom; break; }
                        }
                        if (refNode) {
                            questionsPreview.insertBefore(newDom, refNode);
                        } else {
                            // Si no hay siguiente, agregar al final
                            // Si no hay siguiente, agregar al final
                            questionsPreview.appendChild(newDom);
                        }
                    }
                    agregarEventosBotones();
                    // NO limpiarSeleccion aquí
                    if (preguntaSeleccionadaId) {
                        const selectedItem = document.querySelector(`.question-item[data-pregunta-id='${preguntaSeleccionadaId}']`);
                        if (selectedItem) selectedItem.classList.add('selected');
                    }
                    // Mantener la pestaña Editar activa y el formulario visible
                    const tabEditar = document.querySelector('.tab[data-tab="editar"]');
                    if (tabEditar && !tabEditar.classList.contains('active')) {
                        tabEditar.classList.add('active');
                        document.getElementById('editar-content').classList.add('active');
                    }
                    mostrarEstadoEdicionPregunta(preguntaEnEdicion);
                    return;
                }
            } else {
                // Si es una pregunta existente, actualizar su contenido en el DOM (no eliminar ni agregar)
                const item = document.querySelector(`.question-item[data-pregunta-id='${preguntaEnEdicion.id}']`);
                if (item) {
                    // Actualizar texto, descripción y opciones
                    const textoDiv = item.querySelector('.question-text');
                    if (textoDiv) {
                        textoDiv.innerHTML = preguntaEnEdicion.texto + (preguntaEnEdicion.obligatorio ? '<span class="obligatorio-icon" title="Obligatorio"><span class="obligatorio-circle">!</span></span>' : '');
                    }
                    const descripcionDiv = item.querySelector('.question-description');
                    if (descripcionDiv) {
                        if (preguntaEnEdicion.descripcion) {
                            descripcionDiv.textContent = preguntaEnEdicion.descripcion;
                            descripcionDiv.style.display = '';
                        } else {
                            descripcionDiv.textContent = '';
                            descripcionDiv.style.display = 'none';
                        }
                    } else if (preguntaEnEdicion.descripcion) {
                        const newDesc = document.createElement('div');
                        newDesc.className = 'question-description';
                        newDesc.textContent = preguntaEnEdicion.descripcion;
                        textoDiv.insertAdjacentElement('afterend', newDesc);
                    }
                    const inputDiv = item.querySelector('.question-input');
                    // SOLO actualizar el input si es la pregunta en edición o si NO es tipo mapa
                    if (inputDiv && (preguntaEnEdicion.tipo !== 'mapa' || (preguntaEnEdicion.tipo === 'mapa' && preguntaEnEdicion.id === preguntaSeleccionadaId))) {
                        inputDiv.innerHTML = renderInputPregunta(preguntaEnEdicion);
                    }
                    agregarEventosBotones();
                    // NO limpiarSeleccion aquí
                    if (preguntaSeleccionadaId) {
                        const selectedItem = document.querySelector(`.question-item[data-pregunta-id='${preguntaSeleccionadaId}']`);
                        if (selectedItem) selectedItem.classList.add('selected');
                    }
                    // Mantener la pestaña Editar activa y el formulario visible
                    const tabEditar = document.querySelector('.tab[data-tab="editar"]');
                    if (tabEditar && !tabEditar.classList.contains('active')) {
                        tabEditar.classList.add('active');
                        document.getElementById('editar-content').classList.add('active');
                    }
                    mostrarEstadoEdicionPregunta(preguntaEnEdicion);
                    return;
                }
            }
        }
        // Si NO hay pregunta en edición, recargar el fragmento y aplicar cambios locales
        actualizarVistaPrevia().then(() => {
            // Ocultar preguntas eliminadas
            preguntasEliminadas.forEach(id => {
                const item = document.querySelector(`.question-item[data-pregunta-id="${id}"]`);
                if (item) item.style.display = 'none';
            });
            // Actualizar preguntas editadas visualmente
            preguntasEditadas.forEach(pregunta => {
                const item = document.querySelector(`.question-item[data-pregunta-id="${pregunta.id}"]`);
                if (item) {
                    const textoDiv = item.querySelector('.question-text');
                    if (textoDiv) {
                        textoDiv.innerHTML = pregunta.texto + (pregunta.obligatorio ? '<span class="obligatorio-icon" title="Obligatorio"><span class="obligatorio-circle">!</span></span>' : '');
                        if (pregunta.estilos && pregunta.estilos.nombre) {
                            const s = pregunta.estilos.nombre;
                            textoDiv.style.fontWeight = s.bold ? 'bold' : 'normal';
                            textoDiv.style.fontStyle = s.italic ? 'italic' : 'normal';
                            textoDiv.style.textDecoration = s.underline ? 'underline' : 'none';
                            textoDiv.style.color = s.color || '';
                            textoDiv.style.fontFamily = s.font || '';
                            textoDiv.style.textAlign = s.align || 'left';
                        }
                    }
                    const descripcionDiv = item.querySelector('.question-description');
                    if (descripcionDiv) {
                        if (pregunta.descripcion) {
                            descripcionDiv.textContent = pregunta.descripcion;
                            descripcionDiv.style.display = '';
                            if (pregunta.estilos && pregunta.estilos.descripcion) {
                                const s = pregunta.estilos.descripcion;
                                descripcionDiv.style.fontWeight = s.bold ? 'bold' : 'normal';
                                descripcionDiv.style.fontStyle = s.italic ? 'italic' : 'normal';
                                descripcionDiv.style.textDecoration = s.underline ? 'underline' : 'none';
                                descripcionDiv.style.color = s.color || '';
                                descripcionDiv.style.fontFamily = s.font || '';
                                descripcionDiv.style.textAlign = s.align || 'left';
                            }
                        } else {
                            descripcionDiv.textContent = '';
                            descripcionDiv.style.display = 'none';
                        }
                    } else if (pregunta.descripcion) {
                        const newDesc = document.createElement('div');
                        newDesc.className = 'question-description';
                        newDesc.textContent = pregunta.descripcion;
                        item.querySelector('.question-text').insertAdjacentElement('afterend', newDesc);
                    }
                    const inputDiv = item.querySelector('.question-input');
                    if (inputDiv) inputDiv.innerHTML = renderInputPregunta(pregunta);
                }
            });
            // Agregar preguntas nuevas al final (antes del botón enviar)
            const questionsList = document.querySelector('.questions-list');
            const botonEnviar = document.querySelector('.form-footer-boton-enviar');
            preguntasAñadidas.forEach(pregunta => {
                if (!document.querySelector(`.question-item[data-pregunta-id="${pregunta.id}"]`)) {
                    const nuevaPreguntaDOM = crearPreguntaPreviewDOM(pregunta, true);
                    if (questionsList) {
                        // Insertar antes del botón enviar si existe y es hijo directo de questionsList
                        if (botonEnviar && botonEnviar.parentNode === questionsList) {
                            questionsList.insertBefore(nuevaPreguntaDOM, botonEnviar);
                        } else {
                            questionsList.appendChild(nuevaPreguntaDOM);
                        }
                    } else {
                        // Fallback: agregar al final del preview
                        questionsPreview.appendChild(nuevaPreguntaDOM);
                    }
                }
            });
            agregarEventosBotones();
            // Restaurar selección visual y edición si hay pregunta seleccionada Y no está eliminada
            if (preguntaSeleccionadaId && !preguntasEliminadas.includes(preguntaSeleccionadaId)) {
                const item = document.querySelector(`.question-item[data-pregunta-id='${preguntaSeleccionadaId}']`);
                if (item) {
                    item.classList.add('selected');
                    if (preguntaEnEdicion) {
                        mostrarFormularioEdicion(preguntaEnEdicion);
                    } else {
                        const editBtn = item.querySelector('.edit-question-btn');
                        if (editBtn) editBtn.click();
                    }
                }
            }
            // Inicializar mapas SOLO tras recargar el preview completo (no en cada edición de pregunta)
            if (window.inicializarMapasPreview && window.L && window.L.map) {
                window.inicializarMapasPreview();
            }
        });
    }

    // === SINCRONIZAR TODAS LAS PREGUNTAS DEL DOM AL ARRAY LOCAL ===
function sincronizarPreguntasEditadasDesdeDOM() {
    preguntasEditadas.length = 0;
    document.querySelectorAll('.question-item[data-pregunta-id]').forEach(item => {
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
        // Dependencia
        let pregunta_dependiente = null;
        if (item.hasAttribute('data-pregunta-dependiente-id')) {
            pregunta_dependiente = item.getAttribute('data-pregunta-dependiente-id');
        }
        preguntasEditadas.push({
            id,
            tipo,
            texto,
            descripcion,
            obligatorio,
            mostrar_como_radio,
            permitir_multiple,
            opciones,
            rango_minimo,
            rango_maximo,
            fecha_tipo,
            pregunta_dependiente
        });
    });
}

// Ejecutar al cargar la página y tras recargar el fragmento
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sincronizarPreguntasEditadasDesdeDOM);
} else {
    sincronizarPreguntasEditadasDesdeDOM();
}
// También tras actualizarVistaPrevia
const _actualizarVistaPrevia = actualizarVistaPrevia;
actualizarVistaPrevia = function() {
    return _actualizarVistaPrevia.apply(this, arguments).then(() => {
        sincronizarPreguntasEditadasDesdeDOM();
    });
};

    // --- Selección visual de question-item (solo uno seleccionado a la vez) ---
    document.getElementById('questions-preview')?.addEventListener('click', function(e) {
        const item = e.target.closest('.question-item');
        if (!item) return;
        const preguntaId = item.getAttribute('data-pregunta-id');
        if (!preguntaId) return; // Protección extra
        document.querySelectorAll('.question-item.selected').forEach(el => el.classList.remove('selected'));
        // Seleccionar el actual
        item.classList.add('selected');
        preguntaSeleccionadaId = preguntaId;
        // Buscar si la pregunta ya está en local
        const preguntaLocal = preguntasAñadidas.find(p => p.id == preguntaId) || preguntasEditadas.find(p => p.id == preguntaId);
        // Siempre usar local: nunca recargar ni hacer fetch
        if (preguntaLocal) {
            editarPregunta(preguntaSeleccionadaId);
        }
    });

    // --- Selección robusta tras renderizado ---
let pendingSeleccionPreguntaId = null;

function seleccionarPreguntaDespuesDeRender() {
    if (pendingSeleccionPreguntaId) {
        setTimeout(() => {
            editarPregunta(pendingSeleccionPreguntaId);
            pendingSeleccionPreguntaId = null;
        }, 100);
    }
}

    // Selección y edición del botón enviar
    const botonEnviarItem = document.querySelector('.boton-enviar-item');
    if (botonEnviarItem) {
        botonEnviarItem.addEventListener('click', function(e) {
            e.stopPropagation();
            // Quitar selección de otras preguntas
            document.querySelectorAll('.question-item.selected').forEach(el => el.classList.remove('selected'));
            // Forzar la selección visual tras un pequeño retardo para evitar que el listener global la elimine
            setTimeout(() => {
                botonEnviarItem.classList.add('selected');
            }, 0);
            preguntaSeleccionadaId = 'boton-enviar';
            // Cambiar a la pestaña Editar
            const tabEditar = document.querySelector('.tab[data-tab="editar"]');
            if (tabEditar && !tabEditar.classList.contains('active')) {
                tabEditar.click();
            }
            // Mostrar solo el grupo del botón enviar en el formulario de edición
            const form = document.getElementById('question-form');
            if (form) {
                form.classList.remove('hidden');
                form.querySelectorAll('.form-group').forEach(g => g.style.display = 'none');
                const grupoBotonEnviar = document.getElementById('grupo-boton-enviar');
                if (grupoBotonEnviar) grupoBotonEnviar.style.display = '';
                // --- Sincronizar el textarea con el valor actual del botón ---
                const textareaBoton = document.getElementById('textarea-boton-enviar');
                const inputOculto = document.getElementById('id_texto_boton_enviar');
                const btnPreview = document.querySelector('.btn-enviar-formulario');
                if (textareaBoton && inputOculto) {
                    textareaBoton.value = inputOculto.value || 'Enviar';
                    // El listener para actualizar el input oculto y el preview
                    textareaBoton.removeEventListener('input', window._listenerTextareaBotonEnviar || (()=>{}));
                    window._listenerTextareaBotonEnviar = function() {
                        inputOculto.value = textareaBoton.value;
                        if (btnPreview) btnPreview.textContent = textareaBoton.value;
                    };
                    textareaBoton.addEventListener('input', window._listenerTextareaBotonEnviar);
                }
                // Ocultar mensaje de no selección
                const msg = document.getElementById('no-question-selected-msg');
                if (msg) msg.style.display = 'none';
            }
        });
    }

    // --- ADVERTENCIA AL RECARGAR O SALIR DE LA PÁGINA ---
    window.addEventListener('beforeunload', function(e) {
        // Puedes personalizar el mensaje si lo deseas, pero la mayoría de navegadores mostrarán un mensaje genérico
        e.preventDefault();
        e.returnValue = '¿Seguro que deseas salir o recargar? Puedes perder los datos no guardados.';

        // El valor de returnValue es necesario para algunos navegadores
        return '¿Seguro que deseas salir o recargar? Puedes perder los datos no guardados.';
    });

    // CSS para el círculo naranja obligatorio
if (!window.styleObligatorioAgregado) {
    const styleObligatorio = document.createElement('style');
    styleObligatorio.innerHTML = `.obligatorio-icon { display:inline-block; vertical-align:middle; margin-left:8px; }
.obligatorio-circle { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#ff9800; color:#fff; font-weight:bold; font-size:16px; box-shadow:0 1px 4px rgba(0,0,0,0.08); margin-left:6px; }`;
    document.head.appendChild(styleObligatorio);
    window.styleObligatorioAgregado = true;
}

// Refuerzo: función para sincronizar el valor en el array local (añadir al final del archivo)
function sincronizarFechaTipoLocal(preguntaId, nuevoTipo) {
    let arr = null;
    let idx = -1;
    if (preguntaId && String(preguntaId).startsWith('tmp-')) {
        arr = preguntasAñadidas;
        idx = arr.findIndex(p => p.id == preguntaId);
    } else if (preguntaId) {
        arr = preguntasEditadas;
        idx = arr.findIndex(p => p.id == preguntaId);
    }
    if (arr && idx !== -1) {
               arr[idx].fecha_tipo = nuevoTipo;
    }
}

function sincronizarMapaTipoLocal(preguntaId, nuevoTipo) {
    let arr = null;
    let idx = -1;
    if (preguntaId && String(preguntaId).startsWith('tmp-')) {
        arr = window.preguntasAñadidas;
        idx = arr.findIndex(p => p.id == preguntaId);
    } else if (preguntaId) {
        arr = window.preguntasEditadas;
        idx = arr.findIndex(p => p.id == preguntaId);
    }
    if (arr && idx !== -1) {
        arr[idx].mapa_tipo = nuevoTipo;
    }
}

// Agregar lógica para mover preguntas con flechas arriba/abajo, actualizar el campo 'orden' y animar la transición.
document.addEventListener('click', function(e) {
    // Botón subir pregunta
    if (e.target.closest('.move-up-btn')) {
        const item = e.target.closest('.question-item');
        if (!item) return;
        const prev = item.previousElementSibling;
        if (prev) {
            item.style.transition = 'opacity 0.15s, top 0.15s';
            prev.style.transition = 'opacity 0.15s, top 0.15s';
            item.style.opacity = '0.7';
            prev.style.opacity = '0.7';
            setTimeout(() => {
                item.style.opacity = '';
                prev.style.opacity = '';
                item.parentNode.insertBefore(item, prev);
                item.scrollIntoView({behavior: 'smooth', block: 'center'});
                actualizarOrdenPreguntasDOM();
            }, 150);
        }
    }
    // Botón bajar pregunta
    if (e.target.closest('.move-down-btn')) {
        const item = e.target.closest('.question-item');
        if (!item) return;
        const next = item.nextElementSibling;
        if (next) {
            item.style.transition = 'opacity 0.15s, top 0.15s';
            next.style.transition = 'opacity 0.15s, top 0.15s';
            item.style.opacity = '0.7';
            next.style.opacity = '0.7';
            setTimeout(() => {
                item.style.opacity = '';
                next.style.opacity = '';
                item.parentNode.insertBefore(next, item);
                item.scrollIntoView({behavior: 'smooth', block: 'center'});
                actualizarOrdenPreguntasDOM();
            }, 150);
        }
    }
});

function actualizarOrdenPreguntasDOM() {
    const items = document.querySelectorAll('.questions-list .question-item');
    const orden = [];
    items.forEach((item, idx) => {
        item.querySelector('.question-order-num').textContent = idx + 1;
        orden.push(item.getAttribute('data-pregunta-id'));
    });
    // Enviar al backend
    fetch('/actualizar_orden_preguntas/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.CSRF_TOKEN || '',
        },
       
        body: JSON.stringify({ orden })
   
    });
}

// Mostrar/ocultar el formulario de edición y el mensaje de no selección
function mostrarEstadoEdicionPregunta(pregunta, soloOcultar = false, ocultarHeaderEditBlock = true) {
    const formHeaderEditBlock = document.getElementById('form-header-edit-block');
    const form = document.getElementById('question-form');
    const msg = document.getElementById('no-question-selected-msg');
    // Solo ocultar el form de título/subtítulo si se indica (por defecto true)
    if (formHeaderEditBlock && ocultarHeaderEditBlock) {
        formHeaderEditBlock.style.display = 'none';
        window.headerEditOpen = false;
    }
    // Mostrar/ocultar el form de edición de preguntas y el mensaje de no selección
    if (!pregunta) {
        if (form) form.classList.add('hidden');
        // Mostrar el mensaje solo si NO está abierto el editor de header y el bloque está oculto
        if (
            msg &&
            !window.headerEditOpen &&
            (!formHeaderEditBlock || formHeaderEditBlock.style.display === 'none')
        ) {
            msg.style.display = '';
        } else if (msg) {
            msg.style.display = 'none';
        }
    } else {
        if (form) form.classList.remove('hidden');
        if (msg) msg.style.display = 'none';
    }
}

// Modifica limpiarSeleccion para mostrar el mensaje
function limpiarSeleccion() {
    document.querySelectorAll('.question-item.selected').forEach(function(el) { el.classList.remove('selected'); });
    const botonEnviarItem = document.querySelector('.boton-enviar-item');
    if (botonEnviarItem) botonEnviarItem.classList.remove('selected');
   

    preguntaSeleccionadaId = null;
    mostrarEstadoEdicionPregunta(null);
    // Ir siempre a la pestaña Agregar al deseleccionar
   
    const tabAgregar = document.querySelector('.tab[data-tab="agregar"]');
    const tabContents = document.querySelectorAll('.tab-content');
    if (tabAgregar) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tabAgregar.classList.add('active');
        document.getElementById('agregar-content').classList.add('active');
        // Mostrar siempre los botones de tipo de pregunta
        document.getElementById('question-type-buttons').classList.remove('hidden');
    }
}

// --- FIX: No limpiar selección ni cambiar de pestaña al interactuar con inputs de preguntas ---
document.addEventListener('click', function(e) {
    const isQuestion = e.target.closest('.question-item');
    const isForm = e.target.closest('#question-form');
    const isTypeBtn = e.target.closest('.question-type-btn');
    // NUEVO: Si el target es un input, textarea o select dentro de .question-item, no limpiar selección
    const isInputPregunta = e.target.closest('.question-item') && (
        e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT'
    );
    // NUEVO: Si el click es dentro del formulario de edición o cualquier hijo, no limpiar selección
    const isInsideEditForm = e.target.closest('#question-form');
    if (!isQuestion && !isForm && !isTypeBtn && !isInputPregunta && !isInsideEditForm && document.querySelector('.question-item.selected')) {
        limpiarSeleccion();
    }
}, true);

// --- FIX: Botones de mover arriba/abajo en preguntas nuevas ---
function crearPreguntaPreviewDOM(pregunta, esNueva) {
    const div = document.createElement('div');
    div.className = 'question-item preview-mode';
    div.setAttribute('data-pregunta-id', pregunta.id);
    div.setAttribute('data-tipo', pregunta.tipo);
    div.setAttribute('data-obligatorio', pregunta.obligatorio ? 'true' : 'false');
    if (pregunta.tipo === 'opcion_multiple') {
        div.setAttribute('data-mostrar-como-radio', pregunta.mostrar_como_radio ? 'true' : 'false');
        div.setAttribute('data-permitir-multiple', pregunta.permitir_multiple ? 'true' : 'false');
    }
    if (pregunta.tipo === 'fecha') {
        div.setAttribute('data-fecha-tipo', pregunta.fecha_tipo || 'envio');
    }

    // Indicador visual obligatorio a la derecha con flex
    const obligatorioIcon = pregunta.obligatorio ? `<span class="obligatorio-icon" title="Obligatorio"><span class="obligatorio-circle">!</span></span>` : '';
    div.innerHTML = `
        <div class="question-text">${pregunta.texto}<span style="flex:1 1 auto"></span>${obligatorioIcon}</div>
        ${pregunta.descripcion ? `<div class="question-description">${pregunta.descripcion}</div>` : ''}
        <div class="question-actions">
            <button type="button" class="delete-question-btn" data-id="${pregunta.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="question-input">
            ${renderInputPregunta(pregunta)}
        </div>
    `;
    // --- NUEVO: contar correctamente todas las preguntas (DOM + añadidas locales, sin duplicar) ---
    let totalPreguntas =  0;
    const domPregs = document.querySelectorAll('.questions-list .question-item');
    const idsDom = Array.from(domPregs).map(d => d.getAttribute('data-pregunta-id'));
    const idsLocales = preguntasAñadidas.map(p => p.id);
    // Unir ambos arrays y eliminar duplicados
    const idsUnicos = Array.from(new Set([...idsDom, ...idsLocales]));
    totalPreguntas = idsUnicos.length;
    if (totalPreguntas > 1) {
        const orderControls = document.createElement('div');
        orderControls.className = 'question-order-controls';
        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'move-up-btn';
        upBtn.title = 'Subir';
        upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'move-down-btn';
        downBtn.title = 'Bajar';
        downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
        orderControls.appendChild(upBtn);
        const orderNum = document.createElement('span');
        orderNum.className = 'question-order-num';
        orderControls.appendChild(orderNum);
        orderControls.appendChild(downBtn);
        div.insertBefore(orderControls, div.firstChild);
    }
    return div;
}

function renderInputPregunta(pregunta) {
    const required = pregunta.obligatorio ? 'required' : '';
    // --- TEXTO ---
    if (pregunta.tipo === 'texto') {
        if (pregunta.obligatorio) {
            // Input con icono de exclamación dentro
            return `<div class="input-obligatorio-wrapper" style="position:relative;display:inline-block;width:50%;">
                <input type="text" name="respuesta_${pregunta.id}" placeholder="${pregunta.placeholder || 'Escribe tu respuesta'}" class="text-input obligatorio-pregunta" data-obligatorio="true" ${required} style="padding-right:38px;">
                <span class="obligatorio-icon input-inside" title="Obligatorio" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:2;"><span class="obligatorio-circle">!</span></span>
            </div>`;
        } else {
            return `<input type="text" name="respuesta_${pregunta.id}" placeholder="${pregunta.placeholder || 'Escribe tu respuesta'}" class="text-input" ${required}>`;
        }
    }
    // --- OPCIÓN MÚLTIPLE ---
    if (pregunta.tipo === 'opcion_multiple') {
        if (pregunta.permitir_multiple) {
            return `<div class="opciones-container"><div class="opciones-list">${(pregunta.opciones||[]).map((op,i)=>`<div class="opcion-item"><input type="checkbox" name="respuesta_${pregunta.id}" value="${op}" id="opcion_${pregunta.id}_${i}" class="checkbox-input" ${required}><label for="opcion_${pregunta.id}_${i}" class="checkbox-label"><span class="checkbox-custom"></span><span class="checkbox-text">${op}</span></label></div>`).join('')}</div></div>`;
        } else if (pregunta.mostrar_como_radio) {
            return `<div class="radio-group">${(pregunta.opciones||[]).map((op,i)=>`<label class="radio-label"><input type="radio" name="respuesta_${pregunta.id}" value="${op}" ${required}><span class="radio-custom"></span><span class="radio-text">${op}</span></label>`).join('')}</div>`;
        } else {
            return `<select name="respuesta_${pregunta.id}" class="custom-select" ${required}><option value="" disabled selected>Seleccione una opción</option>${(pregunta.opciones||[]).map(op=>`<option value="${op}">${op}</option>`).join('')}</select>`;
        }
    }
    // --- VALORACIÓN ---
    if (pregunta.tipo === 'valoracion') {
        const min = parseInt(pregunta.rango_minimo) || 1;
        const max = parseInt(pregunta.rango_maximo) || 5;
        let html = '<div class="rating-container">';
        for (let i = min; i <= max; i++) {
            html += `<label class="rating-label"><input type="radio" name="respuesta_${pregunta.id}" value="${i}" ${required}><span class="rating-box">${i}</span></label>`;
        }
        html += '</div>';
        return html;
    }
    // --- FOTO ---
    if (pregunta.tipo === 'foto') {
        return `
        <div class="file-input-container enhanced-file-input" data-pregunta-id="${pregunta.id}">
            <div class="file-input-row">
                <input type="file" name="respuesta_${pregunta.id}" accept="image/*" id="file_${pregunta.id}" class="file-input${pregunta.obligatorio ? ' obligatorio-pregunta' : ''}" ${pregunta.obligatorio ? 'data-obligatorio="true"' : ''} capture="environment">
                <label for="file_${pregunta.id}" class="file-label drop-area custom-file-btn">
                    <i class="fas fa-upload"></i>
                    <span class="file-label-text">Arrastra o selecciona una imagen</span>
                </label>
            </div>
            <div class="file-preview" style="display:none">
                <img class="file-thumb" src="" alt="preview">
                <span class="file-info"></span>
                <span class="file-size"></span>
                <div class="file-menu">
                    <button type="button" class="file-menu-btn"><i class="fas fa-ellipsis-v"></i></button>
                    <div class="file-menu-dropdown">
                        <button type="button" class="file-rename">Renombrar</button>
                        <button type="button" class="file-delete">Eliminar</button>
                        <button type="button" class="file-download">Descargar</button>
                    </div>
                </div>
            </div>
        </div>`;
    }
    // --- VERDADERO/FALSO ---
    if (pregunta.tipo === 'verdadero_falso') {
        return `<div class="radio-group"><label class="radio-label"><input type="radio" name="respuesta_${pregunta.id}" value="verdadero" ${required}><span class="radio-custom"></span><span class="radio-text">Verdadero</span></label><label class="radio-label"><input type="radio" name="respuesta_${pregunta.id}" value="falso" ${required}><span class="radio-custom"></span><span class="radio-text">Falso</span></label></div>`;
    }
    // --- MAPA ---
    if (pregunta.tipo === 'mapa') {
        // Esperar a que el DOM esté listo y luego inicializar el mapa SOLO para este div
        setTimeout(() => {
            const div = document.getElementById(`mapa_${pregunta.id}`);
            if (div && window.L && window.L.map && !div.dataset.mapaInicializado) {
                div.dataset.mapaInicializado = '1';
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
                var marker = null;
                function setCoords(lat, lng) {
                    var latSpan = document.getElementById('lat_' + pregunta.id);
                    var lngSpan = document.getElementById('lng_' + pregunta.id);
                    var inputLat = document.getElementById('input_lat_' + pregunta.id);
                    var inputLng = document.getElementById('input_lng_' + pregunta.id);
                    if (latSpan) latSpan.textContent = lat.toFixed(6);
                    if (lngSpan) lngSpan.textContent = lat.toFixed(6);
                    if (inputLat) inputLat.value = lat;
                    if (inputLng) inputLng.value = lng;
                }
                map.on('click', function(e) {
                    if (marker) map.removeLayer(marker);
                    marker = L.marker(e.latlng).addTo(map);
                    setCoords(e.latlng.lat, e.latlng.lng);
                });
                var geoBtn = document.getElementById('geolocate_' + pregunta.id);
                if (geoBtn) {
                    geoBtn.disabled = false;
                    geoBtn.onclick = function() {
                        map.locate({setView: true, maxZoom: 16});
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
                setTimeout(function() { map.invalidateSize(); }, 200);
            }
        }, 200);
        return `
            <div class="mapa-pregunta-container" style="margin-bottom: 16px;">
                <div id="mapa_${pregunta.id}" class="mapa-pregunta-mapa" style="width:100%;height:250px;margin-bottom:10px;"></div>
                <div class="mapa-coords-row" style="display:flex;gap:16px;align-items:center;">
                    <div class="coords-labels" style="display:flex;gap:12px;align-items:center;">
                        <span><strong>Latitud:</strong> <span id="lat_${pregunta.id}" class="mapa-lat-span">-</span></span>
                        <span><strong>Longitud:</strong> <span id="lng_${pregunta.id}" class="mapa-lng-span">-</span></span>
                    </div>
                    <button type="button" class="btn" id="geolocate_${pregunta.id}" style="height:38px;" disabled>Usar mi ubicación</button>
                </div>
                <input type="hidden" name="respuesta_${pregunta.id}_lat" id="input_lat_${pregunta.id}">
                <input type="hidden" name="respuesta_${pregunta.id}_lng" id="input_lng_${pregunta.id}">
            </div>
        `;
    }
    // --- FECHA ---
    if (pregunta.tipo === 'fecha') {
        if (pregunta.fecha_tipo === 'envio') {
            // Input solo lectura y oculto con la fecha actual
            const hoy = new Date();
            const yyyy = hoy.getFullYear();
            const mm = String(hoy.getMonth() + 1).padStart(2, '0');
            const dd = String(hoy.getDate()).padStart(2, '0');
            const fechaActual = `${yyyy}-${mm}-${dd}`;
            return `<div style="position:relative;width:50%;display:inline-block;">
                <input type="text" value="(se registrará la fecha de envío)" class="text-input" readonly disabled>
                <input type="hidden" name="respuesta_${pregunta.id}" value="${fechaActual}">
            </div>`;
        } else {
            return `<input type="date" name="respuesta_${pregunta.id}" class="text-input" ${required}>`;
        }
    }
    // --- DEFAULT (texto) ---
    return `<input type="text" name="respuesta_${pregunta.id}" placeholder="${pregunta.placeholder || 'Escribe tu respuesta'}" class="text-input" ${required}>`;
}})
// Inicialización de la pestaña Configuración
if (typeof initConfiguracionTab === 'function') {
    initConfiguracionTab();
}
