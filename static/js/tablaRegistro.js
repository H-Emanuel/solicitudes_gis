// archivo: tablaSolicitudes.js

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
            type: 'POST',
            headers: { 'X-CSRFToken': csrf_token },
            dataSrc: function (json) {
                console.log(json);
                return json.data;
            }
        },
        columns: [
            { data: 'id' },
            { data: 'orden_trabajo' },
            { data: 'nombre_solicitante' },
            { data: 'fecha' },
            { data: 'departamento' },
            { data: null, orderable: false, searchable: false, render: renderBotonesAccion },
            {
                data: 'estado',
                render: function (data, type, row) {
                    return renderSelectEstado(row);
                }
            },
            { data: 'departamento' },
            { data: 'departamento' },
            { data: 'fecha_D' },
            { data: 'fecha_T' },
            { data: 'departamento' },
        ]
    });

    $('#tabla_registro').on('change', '.estado-select', manejarCambioEstado);
    $('#tabla_registro').on('click', '.email-link', manejarClickEmail);
    $('#tabla_registro').on('click', '.preview-link', manejarClickVistaPrevia);
});

function renderBotonesAccion(row) {
    const puedeEnviarCorreo = row.estado !== "RECHAZADO";
    const colorCorreo = puedeEnviarCorreo ? '#2f86eb' : 'grey';
    const disabledClass = puedeEnviarCorreo ? '' : 'disabled';
    const pointerEvents = puedeEnviarCorreo ? '' : 'pointer-events: none; cursor: not-allowed;';

    return `
        <a href="#" class="email-link ${disabledClass}" style="text-decoration: none; ${pointerEvents}" 
            data-bs-toggle="modal" data-bs-target="#dynamicEmailModal"
            data-id="${row.id}" data-correo="${row.profesional_correo}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="acciones" style="fill: ${colorCorreo}; width:20px;">
                <path d="M48 64C21.5 64 0 85.5 0 112..." />
            </svg>
        </a>
        <a href="#" class="preview-link" style="text-decoration: none;" data-item='${JSON.stringify(row)}'>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="acciones" style="width:20px;">
                <path d="M0 64C0 28.7 28.7 0 64 0L224..." />
            </svg>
        </a>
        <a href="/solicitud/descargar_pdf/${row.id}" download style="text-decoration: none;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="acciones" style="width:20px;">
                <path d="M288 32c0-17.7-14.3-32-32-32..." />
            </svg>
        </a>
    `;
}

function renderSelectEstado(row) {
    let select = `<select class="estado-select" data-solicitud-id="${row.id}">`;
    row.estados.forEach(function (estado) {
        const selected = row.estado === estado[0] ? 'selected' : '';
        select += `<option value="${estado[0]}" ${selected}>${estado[1]}</option>`;
    });
    select += `</select>`;
    return select;
}

function manejarCambioEstado() {
    const solicitudId = $(this).data('solicitud-id');
    const nuevoEstado = $(this).val();

    $.ajax({
        url: "/actualizar_estado_solicitud/",
        type: "POST",
        data: {
            solicitud_id: solicitudId,
            estado: nuevoEstado,
            csrfmiddlewaretoken: $("input[name='csrfmiddlewaretoken']").val()
        },
        success: function (response) {
            if (response.success) {
                Swal.fire({
                    icon: "success",
                    title: "Estado actualizado correctamente",
                    showConfirmButton: false,
                    timer: 1500
                });
                $('#tabla_registro').DataTable().ajax.reload(null, false);
            } else {
                alert(response.message);
            }
        },
        error: function (xhr, status, error) {
            alert("Error al actualizar el estado:", error);
        }
    });
}

function manejarClickEmail() {
    const correo_destinatario = $(this).data('correo');
    const solicitudId = $(this).data('id');
    $('#destinatarioList').html(`<li class="list-group-item" style="color:gray;">${correo_destinatario}</li>`);
    selectedFichaId = solicitudId;
    console.log('Enviar correo a:', correo_destinatario, 'ID:', solicitudId);
}

function manejarClickVistaPrevia() {
    const item = JSON.parse($(this).attr("data-item"));

    const archivosHTML = (item.archivos_adjuntos_urls || []).length > 0
        ? `<ul>` + item.archivos_adjuntos_urls.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('') + `</ul>`
        : "<p>No hay archivos adjuntos.</p>";

    const apoyosHTML = (item.apoyos || []).length > 0
        ? `<ul>` + item.apoyos.map(apoyo => `<li>${apoyo.nombre} (${apoyo.correo})</li>`).join('') + `</ul>`
        : "<p>No hay apoyos asignados.</p>";

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
        <strong>Apoyos Asignados:</strong> ${apoyosHTML} <br>
    `);

    $('#previewModal').modal('show');
    console.log('Vista previa:', item);
}
