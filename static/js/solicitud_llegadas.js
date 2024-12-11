
let selectedFichaId = null; // Variable global para almacenar el ID de la ficha seleccionada
let correo_destinatario = null; // Variable global para almacenar el correo destinatario

// Agregar un evento 'click' a cada enlace para capturar el data-id y data-correo
document.querySelectorAll('.email-link').forEach(link => {
    link.addEventListener('click', function (event) {
        correo_destinatario = this.getAttribute('data-correo');
        selectedFichaId = this.getAttribute('data-id'); // Guardar el data-id del enlace seleccionado

        // Actualizar el contenido del destinatario en el modal
        const destinatarioList = document.querySelector('#destinatarioList');
        destinatarioList.innerHTML = ''; // Limpiar la lista anterior
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item');
        listItem.style.color = 'gray'; // Aplicar el color directamente
        listItem.textContent = correo_destinatario; // Añadir el texto
        destinatarioList.appendChild(listItem);

    });
});

function addEmail() {
    const emailInput = document.getElementById('emailInput');
    const emailList = document.getElementById('emailList');
    const email = emailInput.value.trim();

    if (email) {
        // Crear un elemento de lista para el nuevo correo
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item');
        listItem.textContent = email;

        // Agregar el elemento a la lista
        emailList.appendChild(listItem);

        // Limpiar el campo de entrada
        emailInput.value = '';
    }
}

// Manejar la selección de archivos y mostrar los nombres en la lista
document.getElementById('fileInput').addEventListener('change', function () {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Limpiar la lista de archivos anteriores

    for (const file of this.files) {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item');
        listItem.textContent = file.name;
        fileList.appendChild(listItem);
    }
});

function sendData() {
    document.getElementById('loadingSpinner').style.display = 'block';

    const emailList = Array.from(document.getElementById('emailList').children).map(item => item.textContent);
    const messageText = document.getElementById('messageText').value;
    const fileInput = document.getElementById('fileInput');
    const formData = new FormData();
    formData.append('emails', JSON.stringify(emailList));
    formData.append('message', messageText);
    formData.append('ficha_id', selectedFichaId);

    for (const file of fileInput.files) {
        formData.append('files', file);
    }

    fetch('/correos/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': '{{ csrf_token }}',
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('loadingSpinner').style.display = 'none';

        if (data.success) {
            Swal.fire({
                icon: "success",
                title: "Datos enviados con éxito",
                showConfirmButton: false,
                timer: 1500
            });

            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('dynamicEmailModal'));
                modal.hide();
                location.reload();
            }, 1500);
        } else {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Hubo un problema al enviar los datos",
            });

        }
    })
    .catch(error => {

        document.getElementById('loadingSpinner').style.display = 'none';
        console.error('Error:', error);
        Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Ocurrió un error al enviar los datos",
            });
    });
}



// VISTA DE REGISTRO PREVIO


var previewLinks = document.querySelectorAll('.registro-preview-link');

previewLinks.forEach(function(link) {
    link.addEventListener('click', function(event) {
        event.preventDefault(); // Evitar el comportamiento predeterminado del enlace

        var protocoloId = parseInt(this.getAttribute('data-protocolo-id')); // Convertir a número

        // Hacer una solicitud AJAX a la vista de Django para obtener los datos
        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/vista_previa_reaccinacion/' + protocoloId, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);

                // Seleccionar el contenedor para mostrar los datos
                var previewDataElement = document.getElementById('registroPreviewData');
                previewDataElement.innerHTML = ''; // Limpiar contenido previo

                data.registros.forEach(function(registro) {
                    previewDataElement.innerHTML += 
                        '<p><strong>Profesional Anterior:</strong> ' + registro.Profesional_N + ' '+ registro.Profesional_N_1  +'</p>' +
                        '<p><strong>Objeto:</strong> ' + registro.Motivo + '</p>' +
                        '<p><strong>Fecha:</strong> ' + registro.Fecha + '</p>' +
                        '<hr>';
                });

                // Mostrar el modal
                $('#registroPreviewModal').modal('show');
            }
        };
        xhr.send();
    });
});

// BOTON DE RESETEO

const resetLinks = document.querySelectorAll('.reset-link');

resetLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault(); // Evita que el enlace recargue la página

        const solicitudId = this.dataset.id; // Obtén el ID de la solicitud
        const url = '/resert_limite/'; // URL de tu vista Django

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken() // Función para obtener el token CSRF
            },
            body: JSON.stringify({ id: solicitudId }) // Envía el ID en formato JSON
        })
        .then(response => {
            if (response.ok) {
                
                return response.json();
            } else {
                throw new Error('Error al resetear la solicitud.');
            }
        })
        .then(data => {
            Swal.fire({
                icon: "success",
                title: data.message,
                showConfirmButton: false,
                timer: 1500
            });
            setTimeout(() => {
                location.reload();
            }, 1500);
        })
        .catch(error => {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: "Hubo un problema al procesar la solicitud",
            });

        });
    });
});

// Función para obtener el token CSRF
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('csrftoken=')) {
            return cookie.substring('csrftoken='.length, cookie.length);
        }
    }
    return '';
};
