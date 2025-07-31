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
            { data: 'id' }, // Id de la solicitud
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
                },
                {
                    data: 'estado',
                    render: function (data, type, row) {
                        let select = `<select class="estado-select" data-solicitud-id="${row.id}">`;
                        row.estados.forEach(function (estado) {
                            const selected = data === estado[0] ? 'selected' : '';
                            select += `<option value="${estado[0]}" ${selected}>${estado[1]}</option>`;
                        });
                        select += `</select>`;
                        return select;
                    }
                },
            { data: 'departamento' },
            { data: 'departamento' },
            { data: 'fecha_D' },
            { data: 'fecha_T' },
            { data: 'departamento' },



        ]
        });

});


                        // <th>Id de la solicitud</th>
                        // <th>Orden Trabajo</th>
                        // <th>Solicitante</th>
                        // <th>Fecha de llegada</th>
                        // <th>Departamento</th>
                        // <th>Acciones</th>
                        // <th>Estado</th>
                        // <th>Carga de trabajo</th>
                        // <th>profesional SIG</th>
                        // <th>Fecha Designio</th>
                        // <th>Fecha Enviado</th>
                        // <th>Dias Hábiles</th>


$('#tabla_registro').on('click', '.email-link', function () {
    var btn = $(this);
    var correo_destinatario = btn.data('correo');
    var solicitudId = btn.data('id');

    // Limpiar la lista anterior y agregar el nuevo destinatario
    $('#destinatarioList').html(`<li class="list-group-item" style="color:gray;">${correo_destinatario}</li>`);

    // Guardar el ID de la solicitud seleccionada
    selectedFichaId = solicitudId
    console.log('Enviar correo a:', correo, 'ID:', id);
    // Lógica para abrir modal y pasar datos
});

$('#tabla_registro').on('click', '.preview-link', function () {

    var item = JSON.parse($(this).attr("data-item"));
    
    var archivosHTML = (item.archivos_adjuntos_urls && Array.isArray(item.archivos_adjuntos_urls) && item.archivos_adjuntos_urls.length > 0)
    ? `<ul>` + item.archivos_adjuntos_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('') + `</ul>`
    : "<p>No hay archivos adjuntos.</p>";

    // Generar lista de apoyos
    var apoyosHTML = (item.apoyos && Array.isArray(item.apoyos) && item.apoyos.length > 0)
        ? `<ul>` + item.apoyos.map(apoyo => `<li>${apoyo.nombre} (${apoyo.correo})</li>`).join('') + `</ul>`
        : "<p>No hay apoyos asignados.</p>";

    // Insertar los datos directamente en el modal
    $('#previewData').html(`
        <strong>ID:</strong> ${item.id} <br>
        <strong>Código:</strong> ${item.codigo} <br>
        <strong>Departamento:</strong> ${item.departamento} <br>
        <strong>Dirección:</strong> ${item.direccion} <br>
        <strong>Solicitante:</strong> ${item.nombre_solicitante} <br>
        <strong>Proyecto:</strong> ${item.nombre_proyecto} <br>
        <strong>Correo Solicitante:</strong> ${item.corre_solicitante} <br>
        <strong>Área:</strong> ${item.area} <br>
        <strong>Objetivos:</strong> ${item.objetivos} <br>
        <strong>Cambios Posibles:</strong> ${item.cambios_posible} <br>
        <strong>Fecha:</strong> ${item.fecha} <br>
        <strong>Fecha Designio:</strong> ${item.fecha_D} <br>
        <strong>Fecha Término:</strong> ${item.fecha_T} <br>
        <strong>Fecha Límite:</strong> ${item.fecha_L} <br>
        <strong>Profesional:</strong> ${item.profesional_nombre} <br>
        <strong>Correo Profesional:</strong> ${item.profesional_correo} <br>
        <strong>Tipo de Límite:</strong> ${item.tipo_limite} <br>
        <strong>Estado:</strong> ${item.estado} <br>
        <strong>Correo Enviado:</strong> ${item.enviado_correo ? 'Sí' : 'No'} <br>
        <strong>Correo Enviado (Solicitante):</strong> ${item.enviado_correo_t ? 'Sí' : 'No'} <br>
        <strong>Número de Designios:</strong> ${item.numero_designios} <br>
        <strong>Días Restantes:</strong> ${item.dias_restantes} <br>
        <strong>Archivos Adjuntos:</strong> ${archivosHTML} <br>
        <strong>Apoyos Asignados:</strong> ${apoyosHTML} <br> <!-- Aquí agregamos los apoyos -->
    `);

    // Mostrar el modal
    $('#previewModal').modal('show');
  console.log('Vista previa:', item);
  // Abrir modal o mostrar contenido
});
