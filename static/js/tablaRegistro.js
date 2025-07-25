$(document).ready(function () {

    setTimeout(function () {
        $('.dataTables_filter input').attr('placeholder', 'Buscar');
    }, 500);

    let table = $('#tabla_registro').DataTable({
        processing: true,
        serverSide: true,
         language: {
            url: "/static/js/es-MX.json"
        },
        ajax: {
            url: '/solicitudes_json/',
            type: 'POST',  // ← CAMBIAR AQUÍ
            headers: { 'X-CSRFToken': csrf_token },  // ← Agrega esto si usas Django
            dataSrc: function(json) {
            console.log(json);  // Verifica estructura
            return json.data;
            }
        },
        columns: [
            { data: 'id' },
            { data: 'orden_trabajo' }, // ✅ corregido aquí
            { data: 'nombre_solicitante' },
            { data: 'fecha' },
            { data: 'departamento' },
            {
                data: null,
                orderable: false,
                searchable: false,
                render: function (data, type, row) {
                    // Color de ícono si puede enviar correo
                    const puedeEnviarCorreo = row.estado !== "RECHAZADO";
                    const colorCorreo = puedeEnviarCorreo ? '#2f86eb' : 'grey';
                    const disabledClass = puedeEnviarCorreo ? '' : 'disabled';
                    const pointerEvents = puedeEnviarCorreo ? '' : 'pointer-events: none; cursor: not-allowed;';

                    return `
                    <a href="#" class="email-link ${disabledClass}" 
                        style="text-decoration: none; ${pointerEvents}" 
                        data-bs-toggle="modal" 
                        data-bs-target="#dynamicEmailModal"
                        data-id="${row.id}" 
                        data-correo="${row.profesional_correo}">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="acciones" style="fill: ${colorCorreo}; width:20px;">
                        <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/>
                        </svg>
                    </a>

                    <a href="#" class="preview-link" 
                        style="text-decoration: none;" 
                        data-item='${JSON.stringify(row)}'>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="acciones" style="width:20px;">
                        <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z"/>
                        </svg>
                    </a>

                    <a href="/solicitud/descargar_pdf/${row.id}" download style="text-decoration: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="acciones" style="width:20px;">
                        <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32v242.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64h384c35.3 0 64-28.7 64-64v-32c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
                        </svg>
                    </a>
                    `;
                }
                }
        ]
        });

});


$('#tabla_registro').on('click', '.email-link', function () {
  const id = $(this).data('id');
  const correo = $(this).data('correo');
  console.log('Enviar correo a:', correo, 'ID:', id);
  // Lógica para abrir modal y pasar datos
});

$('#tabla_registro').on('click', '.preview-link', function () {
  const item = $(this).data('item');
  console.log('Vista previa:', item);
  // Abrir modal o mostrar contenido
});
