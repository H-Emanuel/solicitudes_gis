// Lógica de selección de tema de color para la sección Apariencia
// Este archivo es independiente y puede ser importado en agregar_pregunta.html

(function() {
    function inicializarSelectorTemaColor() {
        const colorOpciones = document.querySelectorAll('.tema-color-opcion');
        const inputColor = document.getElementById('tema_color_input');
        const previewContainer = document.querySelector('.questions-preview-container');
        if (!colorOpciones.length || !inputColor) return;

        // --- INICIO: Marcar visualmente el color seleccionado al cargar ---
        const colorSeleccionado = inputColor.value;
        colorOpciones.forEach(o => {
            // Normalizar colores a minúsculas para comparar
            if ((o.getAttribute('data-color') || '').toLowerCase() === (colorSeleccionado || '').toLowerCase()) {
                o.style.border = '2.5px solid #333';
                // Agregar el check si no existe
                if (!o.querySelector('i.fa-check')) {
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-check';
                    icon.style.color = '#333';
                    icon.style.fontSize = '26px';
                    icon.style.pointerEvents = 'none';
                    o.appendChild(icon);
                }
                // Actualizar el fondo del preview
                if (previewContainer) {
                    previewContainer.style.backgroundColor = colorSeleccionado;
                }
            } else {
                o.style.border = '2.5px solid #e5e7eb';
                const icon = o.querySelector('i.fa-check');
                if (icon) icon.remove();
            }
        });
        // --- FIN: Marcar visualmente el color seleccionado al cargar ---

        colorOpciones.forEach(opcion => {
            opcion.addEventListener('click', function() {
                // Quitar el check y borde de todos
                colorOpciones.forEach(o => {
                    o.style.border = '2.5px solid #e5e7eb';
                    const icon = o.querySelector('i.fa-check');
                    if (icon) icon.remove();
                });
                // Marcar el seleccionado
                this.style.border = '2.5px solid #333';
                // Agregar el check
                if (!this.querySelector('i.fa-check')) {
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid fa-check';
                    icon.style.color = '#333';
                    icon.style.fontSize = '26px';
                    icon.style.pointerEvents = 'none';
                    this.appendChild(icon);
                }
                // Actualizar input oculto
                inputColor.value = this.getAttribute('data-color');
                // CAMBIO EN TIEMPO REAL: actualizar el fondo del preview
                if (previewContainer) {
                    previewContainer.style.backgroundColor = this.getAttribute('data-color');
                }
            });
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarSelectorTemaColor);
    } else {
        inicializarSelectorTemaColor();
    }
})();
