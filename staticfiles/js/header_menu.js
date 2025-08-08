// Lógica para el header superior y menú desplegable en la edición de formularios
// Archivo: static/js/header_menu.js

document.addEventListener('DOMContentLoaded', function() {
    // Elementos del header
    const menuBtn = document.getElementById('menu-toggle-btn');
    const menuDropdown = document.getElementById('header-menu-dropdown');
    const editNombreBtn = document.getElementById('edit-nombre-btn');
    const modalEditarNombre = document.getElementById('modal-editar-nombre');
    const cancelarEditarNombre = document.getElementById('cancelar-editar-nombre');
    const formEditarNombre = document.getElementById('form-editar-nombre');
    const formNombreSpan = document.getElementById('form-nombre');
    const inputNombreForm = document.getElementById('input-nombre-form');
    const inputDescForm = document.getElementById('input-desc-form');
    const inputDepartamentoForm = document.getElementById('input-departamento-form');

    // Menú desplegable
    if(menuBtn && menuDropdown) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            menuDropdown.classList.toggle('open');
        });
        document.addEventListener('click', function(e) {
            if (!menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
                menuDropdown.classList.remove('open');
            }
        });
    }

    // Modal editar nombre/desc
    if(editNombreBtn && modalEditarNombre) {
        editNombreBtn.addEventListener('click', function() {
            modalEditarNombre.classList.add('visible');
            inputNombreForm.value = formNombreSpan.textContent;
            inputDescForm.value = document.querySelector('.form-description')?.textContent || '';
            setTimeout(()=>inputNombreForm.focus(), 100);
        });
    }
    if(cancelarEditarNombre && modalEditarNombre) {
        cancelarEditarNombre.addEventListener('click', function() {
            modalEditarNombre.classList.remove('visible');
        });
    }
    if(modalEditarNombre) {
        modalEditarNombre.addEventListener('click', function(e) {
            if(e.target === modalEditarNombre) modalEditarNombre.classList.remove('visible');
        });
    }
    if(formEditarNombre) {
        formEditarNombre.addEventListener('submit', function(e) {
            e.preventDefault();
            const nombre = inputNombreForm.value.trim();
            const descripcion = inputDescForm.value.trim();
            const departamento = inputDepartamentoForm ? inputDepartamentoForm.value.trim() : '';
            if(!nombre) return;
            // Actualizar en el header
            formNombreSpan.textContent = nombre;
            // Actualizar en la descripción si existe
            const descEl = document.querySelector('.form-description');
            if(descEl) descEl.textContent = descripcion;
            // Actualizar en el backend (AJAX)
            fetch(`/survey/actualizar_nombre_formulario/${window.FORMULARIO_ID}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.CSRF_TOKEN
                },
                body: JSON.stringify({nombre, descripcion, departamento})
            }).then(()=>{});
            modalEditarNombre.classList.remove('visible');
        });
    }
});
