// configuracion.js
// Archivo para funciones de la pestaña Configuración y futuras funcionalidades relacionadas

export function initConfiguracionTab() {
    // Aquí se inicializarán los eventos y lógica de la pestaña Configuración
    console.log('Pestaña Configuración inicializada');

    // Insertar el switch en la pestaña de configuración
    const configTab = document.getElementById('configuracion-content');
    if (!configTab) return;
    let html = `<div class="form-group" style="margin-top:24px;">
        <label style="display:flex;align-items:center;gap:12px;font-weight:500;">
            <span class="switch">
                <input type="checkbox" id="switch-volver-contestar">
                <span class="switch-slider"></span>
            </span>
            Permitir volver a contestar la encuesta tras enviar
        </label>
        <div style="font-size:0.97em;color:#666;margin-top:4px;">Si está activo, tras enviar la respuesta se mostrará un enlace para volver a contestar la encuesta.</div>
    </div>`;
    configTab.insertAdjacentHTML('afterbegin', html);

    // Cargar el valor actual desde el backend (inyectado en window.FORMULARIO_PERMITIR_VOLVER)
    const switchInput = document.getElementById('switch-volver-contestar');
    if (switchInput && typeof window.FORMULARIO_PERMITIR_VOLVER !== 'undefined') {
        switchInput.checked = !!window.FORMULARIO_PERMITIR_VOLVER;
    }

    // Guardar el valor al guardar el formulario
    const guardarBtn = document.getElementById('guardar-borrador');
    if (guardarBtn) {
        guardarBtn.addEventListener('click', function() {
            if (switchInput) {
                // Guardar el valor en window para que agregar_pregunta.js lo envíe
                window.FORMULARIO_PERMITIR_VOLVER = switchInput.checked;
            }
        });
    }
}
