let estilosPreguntaPreview = {
    titulo: { bold: false, italic: false, underline: false, color: '#000000', font: "'Inter',sans-serif", align: 'center' },
    subtitulo: { bold: false, italic: false, underline: false, color: '#000000', font: "'Inter',sans-serif", align: 'center' },
    placeholder: { bold: false, italic: false, underline: false, color: '', font: '', align: 'left' }
};

export function getEstilosHeaderActual() {
    // Devuelve una copia para evitar mutaciones externas
    // Si el valor es 'none', devolver 'titulo' o 'subtitulo'
    return {
        titulo: {...estilosPreguntaPreview.titulo},
        subtitulo: {...estilosPreguntaPreview.subtitulo}
    };
}

export function inicializarFormHeader() {
    // Cargar estilos del formulario
    fetch(`/survey/obtener_datos_formulario/${window.FORMULARIO_ID}/`)
        .then(response => response.json())
        .then(data => {
            if (data.estilos_header) {
                estilosPreguntaPreview = {
                    titulo: data.estilos_header.titulo,
                    subtitulo: data.estilos_header.subtitulo
                };
                aplicarEstilosFormularioHeader();
            }
        });

    function aplicarEstilosFormularioHeader() {
        const h1 = document.querySelector('.form-title-container h1');
        const desc = document.querySelector('.form-title-container .form-description');
        if (h1) {
            Object.assign(h1.style, {
                fontWeight: estilosPreguntaPreview.titulo.bold ? 'bold' : 'normal',
                fontStyle: estilosPreguntaPreview.titulo.italic ? 'italic' : 'normal',
                textDecoration: estilosPreguntaPreview.titulo.underline ? 'underline' : 'none',
                color: estilosPreguntaPreview.titulo.color || '#000000',
                fontFamily: estilosPreguntaPreview.titulo.font || "'Inter',sans-serif",
                textAlign: estilosPreguntaPreview.titulo.align || 'center'
            });
        }
        if (desc) {
            Object.assign(desc.style, {
                fontWeight: estilosPreguntaPreview.subtitulo.bold ? 'bold' : 'normal',
                fontStyle: estilosPreguntaPreview.subtitulo.italic ? 'italic' : 'normal',
                textDecoration: estilosPreguntaPreview.subtitulo.underline ? 'underline' : 'none',
                color: estilosPreguntaPreview.subtitulo.color || '#000000',
                fontFamily: estilosPreguntaPreview.subtitulo.font || "'Inter',sans-serif",
                textAlign: estilosPreguntaPreview.subtitulo.align || 'center'
            });
        }
        // --- NUEVO: Actualizar toolbars visualmente después de aplicar estilos ---
        actualizarToolbarVisual('titulo');
        actualizarToolbarVisual('subtitulo');
    }

    function actualizarFormularioHeaderDOM() {
        const h1 = document.querySelector('.form-title-container h1');
        if (h1) {
            // Quitar el prefijo "Título:" y solo mostrar el valor
            let val = document.getElementById('titulo_formulario')?.value || '';
            if (!val || val === 'none') val = 'titulo';
            h1.textContent = val;
        }
        const desc = document.querySelector('.form-title-container .form-description');
        if (desc) {
            let val = document.getElementById('subtitulo_formulario')?.value || '';
            if (!val || val === 'none') val = 'subtitulo';
            desc.textContent = val;
        }
        aplicarEstilosFormularioHeader();
        // (Ya no es necesario llamar aquí a actualizarToolbarVisual, se hace en aplicarEstilosFormularioHeader)
    }

    function actualizarToolbarVisual(campo) {
        const toolbar = document.querySelector(`.toolbar-mini[data-target="${campo === 'titulo' ? 'titulo_formulario' : campo === 'subtitulo' ? 'subtitulo_formulario' : 'id_placeholder'}"]`);
        if (!toolbar) return;
        toolbar.querySelectorAll('.toolbar-btn[data-cmd="bold"]').forEach(btn => btn.classList.toggle('active', estilosPreguntaPreview[campo].bold));
        toolbar.querySelectorAll('.toolbar-btn[data-cmd="italic"]').forEach(btn => btn.classList.toggle('active', estilosPreguntaPreview[campo].italic));
        toolbar.querySelectorAll('.toolbar-btn[data-cmd="underline"]').forEach(btn => btn.classList.toggle('active', estilosPreguntaPreview[campo].underline));
        ['left','center','right'].forEach(al=>{
            toolbar.querySelectorAll(`.toolbar-btn[data-cmd="justify${al.charAt(0).toUpperCase()+al.slice(1)}"]`).forEach(btn => {
                btn.classList.toggle('active', estilosPreguntaPreview[campo].align === al);
            });
        });
        const colorInput = toolbar.querySelector('.toolbar-color');
        if (colorInput) colorInput.value = estilosPreguntaPreview[campo].color || '#000000';
        const fontSelect = toolbar.querySelector('.toolbar-font');
        if (fontSelect) fontSelect.value = estilosPreguntaPreview[campo].font || "'Inter',sans-serif";
    }

    function inicializarToolbarMinimalista() {
        document.querySelectorAll('.toolbar-mini').forEach(toolbar => {
            const targetId = toolbar.getAttribute('data-target');
            let campo = 'titulo';
            if (targetId === 'subtitulo_formulario') campo = 'subtitulo';
            if (targetId === 'id_placeholder') campo = 'placeholder';
            toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cmd = btn.getAttribute('data-cmd');
                    if(cmd.startsWith('justify')) {
                        estilosPreguntaPreview[campo].align = cmd.replace('justify','').toLowerCase();
                    } else {
                        estilosPreguntaPreview[campo][cmd] = !estilosPreguntaPreview[campo][cmd];
                    }
                    actualizarFormularioHeaderDOM();
                    actualizarToolbarVisual(campo);
                });
            });
            const colorInput = toolbar.querySelector('.toolbar-color');
            if (colorInput) {
                colorInput.addEventListener('input', function() {
                    estilosPreguntaPreview[campo].color = colorInput.value;
                    actualizarFormularioHeaderDOM();
                    actualizarToolbarVisual(campo);
                });
            }
            const fontSelect = toolbar.querySelector('.toolbar-font');
            if (fontSelect) {
                fontSelect.addEventListener('change', function() {
                    estilosPreguntaPreview[campo].font = fontSelect.value;
                    actualizarFormularioHeaderDOM();
                    actualizarToolbarVisual(campo);
                });
            }
            // --- Al inicializar, reflejar el estado actual de estilos ---
            actualizarToolbarVisual(campo);
        });
    }

    // Edición al hacer click en el header
    const formTitleContainer = document.getElementById('form-title-container');
    if (formTitleContainer) {
        formTitleContainer.addEventListener('click', function() {
            const editBlock = document.getElementById('form-header-edit-block');
            if (editBlock) {
                editBlock.style.display = '';
                window.headerEditOpen = true;
                formTitleContainer.classList.add('form-header-selected');
                // Ocultar mensaje de no selección y el form de edición de pregunta, pero NO ocultar el bloque de edición de header
                if (window.mostrarEstadoEdicionPregunta) {
                    window.mostrarEstadoEdicionPregunta(null, true, false);
                } else {
                    // Fallback: ocultar el mensaje manualmente si la función global no está lista
                    const msg = document.getElementById('no-question-selected-msg');
                    if (msg) msg.style.display = 'none';
                }
                const tabEditar = document.querySelector('.tab[data-tab="editar"]');
                if (tabEditar && !tabEditar.classList.contains('active')) {
                    tabEditar.click();
                }
                const tituloInput = document.getElementById('titulo_formulario');
                if (tituloInput) {
                    tituloInput.focus();
                    tituloInput.select();
                }
                // --- NUEVO: Reflejar el estado de los toolbars al abrir edición ---
                actualizarToolbarVisual('titulo');
                actualizarToolbarVisual('subtitulo');
            }
        });
    }
    document.addEventListener('mousedown', function(e) {
        const editBlock = document.getElementById('form-header-edit-block');
        const formTitleContainer = document.getElementById('form-title-container');
        if (editBlock && editBlock.style.display !== 'none') {
            if (!editBlock.contains(e.target) && !e.target.closest('#form-title-container')) {
                editBlock.style.display = 'none';
                window.headerEditOpen = false;
                if (formTitleContainer) formTitleContainer.classList.remove('form-header-selected');
                if (window.mostrarEstadoEdicionPregunta) window.mostrarEstadoEdicionPregunta(null);
                const tabAgregar = document.querySelector('.tab[data-tab="agregar"]');
                if (tabAgregar && !tabAgregar.classList.contains('active')) {
                    tabAgregar.click();
                }
            }
        }
    });

    // Inputs de título y subtítulo: actualización en tiempo real
    const tituloInput = document.getElementById('titulo_formulario');
    const subtituloInput = document.getElementById('subtitulo_formulario');
    if (tituloInput) {
        tituloInput.addEventListener('input', actualizarFormularioHeaderDOM);
    }
    if (subtituloInput) {
        subtituloInput.addEventListener('input', actualizarFormularioHeaderDOM);
    }

    // Inicializar toolbars
    inicializarToolbarMinimalista();
    // Aplicar estilos iniciales (esto también actualiza los toolbars)
    aplicarEstilosFormularioHeader();
}

window.getEstilosHeaderActual = getEstilosHeaderActual;
