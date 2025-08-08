// Lógica completa para la portada del formulario (modal, cropper, subida, eliminación, sincronización)
window.portadaBlobPendiente = null;

document.addEventListener('DOMContentLoaded', function() {
    // Mostrar modal al hacer click en la portada
    const portadaInteractiva = document.getElementById('portada-interactiva');
    const modalPortada = document.getElementById('modal-portada');
    const inputPortada = document.getElementById('input-portada');
    const cropperContainer = document.getElementById('cropper-container');
    const btnGuardarPortada = document.getElementById('guardar-portada');
    const btnCancelarPortada = document.getElementById('cancelar-portada');
    const btnEliminarPortada = document.getElementById('eliminar-portada');
    const inputImagenOculto = document.getElementById('input-imagen-oculto');
    let cropper = null;

    // Abrir modal
    if (portadaInteractiva && modalPortada) {
        portadaInteractiva.addEventListener('click', function() {
            modalPortada.classList.add('visible');
            modalPortada.style.display = 'flex';
            // Mostrar imagen actual en el cropper si existe y no hay selección nueva
            setTimeout(function() {
                if (!inputPortada.value) {
                    let portadaImg = document.querySelector('.form-header #portada-interactiva.form-image');
                    if (portadaImg && portadaImg.src) {
                        cropperContainer.innerHTML = `<img id="img-cropper" src="${portadaImg.src}" style="max-width:100%;max-height:200px;">`;
                        const img = document.getElementById('img-cropper');
                        if (img) {
                            cropper = new window.Cropper(img, {
                                aspectRatio: 16/9,
                                viewMode: 1,
                                autoCropArea: 1,
                                responsive: true,
                                background: false,
                                movable: true,
                                cropBoxMovable: true,
                                cropBoxResizable: true,
                                dragMode: 'move',
                                minCropBoxWidth: 100,
                                minCropBoxHeight: 56
                            });
                        }
                    }
                }
            }, 100);
        });
    }
    // Cerrar modal al hacer click fuera del contenido
    if (modalPortada) {
        modalPortada.addEventListener('click', function(e) {
            if (e.target === modalPortada) {
                modalPortada.classList.remove('visible');
                modalPortada.style.display = 'none';
                limpiarCropper();
            }
        });
    }
    if (btnCancelarPortada) {
        btnCancelarPortada.addEventListener('click', function() {
            modalPortada.classList.remove('visible');
            modalPortada.style.display = 'none';
            limpiarCropper();
        });
    }
    function limpiarCropper() {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropperContainer.innerHTML = '';
        if (inputPortada) inputPortada.value = '';
    }
    // Inicializar cropper al seleccionar imagen
    if (inputPortada) {
        inputPortada.addEventListener('change', function() {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                cropperContainer.innerHTML = `<img id="img-cropper" src="${e.target.result}" style="max-width:100%;max-height:200px;">`;
                const img = document.getElementById('img-cropper');
                if (img) {
                    cropper = new window.Cropper(img, {
                        aspectRatio: 16/9,
                        viewMode: 1,
                        autoCropArea: 1,
                        responsive: true,
                        background: false,
                        movable: true,
                        cropBoxMovable: true,
                        cropBoxResizable: true,
                        dragMode: 'move',
                        minCropBoxWidth: 100,
                        minCropBoxHeight: 56
                    });
                }
            };
            reader.readAsDataURL(file);
        });
    }
    // Guardar recorte
    if (btnGuardarPortada) {
        btnGuardarPortada.addEventListener('click', function() {
            if (!cropper) {
                alert('Selecciona y ajusta una imagen antes de guardar.');
                return;
            }
            cropper.getCroppedCanvas({width: 1200, height: 675}).toBlob(function(blob) {
                window.portadaBlobPendiente = blob;
                if (inputImagenOculto) {
                    const dt = new DataTransfer();
                    dt.items.add(new File([blob], 'portada.jpg', {type: 'image/jpeg'}));
                    inputImagenOculto.files = dt.files;
                }
                // Actualizar preview en la portada en tiempo real
                let portadaImg = document.getElementById('portada-interactiva');
                if (portadaImg) {
                    if (portadaImg.tagName === 'DIV') {
                        const newImg = document.createElement('img');
                        newImg.src = URL.createObjectURL(blob);
                        newImg.alt = 'Imagen del formulario';
                        newImg.className = 'form-image portada-interactiva';
                        newImg.id = 'portada-interactiva';
                        newImg.style.width = '100%';
                        newImg.style.height = '250px';
                        newImg.style.objectFit = 'cover';
                        newImg.style.cursor = 'pointer';
                        portadaImg.parentNode.replaceChild(newImg, portadaImg);
                    } else if (portadaImg.tagName === 'IMG') {
                        portadaImg.src = URL.createObjectURL(blob);
                    }
                }
                setTimeout(asignarClickPortada, 100); // Reasignar click
                mostrarMensajeFlotante('Foto de la portada guardada con éxito', 'success');
                modalPortada.classList.remove('visible');
                modalPortada.style.display = 'none';
                limpiarCropper();
            }, 'image/jpeg', 0.92);
        });
    }
    // Eliminar portada
    if (btnEliminarPortada) {
        btnEliminarPortada.addEventListener('click', function() {
            if (!confirm('¿Estás seguro de que deseas eliminar la portada?')) return;
            // Cambios solo locales: limpiar input oculto, blob y preview
            if (inputImagenOculto) inputImagenOculto.value = '';
            window.portadaBlobPendiente = null;
            // --- NUEVO: marcar eliminación para el backend ---
            let inputEliminar = document.getElementById('eliminar-portada-backend');
            if (!inputEliminar) {
                inputEliminar = document.createElement('input');
                inputEliminar.type = 'hidden';
                inputEliminar.name = 'eliminar_portada';
                inputEliminar.id = 'eliminar-portada-backend';
                inputEliminar.value = '1';
                if (inputImagenOculto && inputImagenOculto.form) {
                    inputImagenOculto.form.appendChild(inputEliminar);
                }
            } else {
                inputEliminar.value = '1';
            }
            let portadaImg = document.getElementById('portada-interactiva');
            if (portadaImg && portadaImg.tagName === 'IMG') {
                // Reemplazar por el div placeholder
                const placeholderDiv = document.createElement('div');
                placeholderDiv.className = 'form-image-placeholder portada-interactiva';
                placeholderDiv.id = 'portada-interactiva';
                placeholderDiv.style.width = '100%';
                placeholderDiv.style.height = '250px';
                placeholderDiv.style.display = 'flex';
                placeholderDiv.style.alignItems = 'center';
                placeholderDiv.style.justifyContent = 'center';
                placeholderDiv.style.background = '#e5e7eb';
                placeholderDiv.style.cursor = 'pointer';
                placeholderDiv.style.position = 'relative';
                placeholderDiv.innerHTML = '<i class="fa-regular fa-image" style="font-size:64px;color:#b0b0b0;"></i>';
                portadaImg.parentNode.replaceChild(placeholderDiv, portadaImg);
            } else if (portadaImg) {
                portadaImg.innerHTML = '<i class="fa-regular fa-image" style="font-size:64px;color:#b0b0b0;"></i>';
            }
            setTimeout(asignarClickPortada, 100); // Reasignar click
            modalPortada.classList.remove('visible');
            modalPortada.style.display = 'none';
            limpiarCropper();
            mostrarMensajeFlotante('La portada será eliminada al guardar el formulario', 'success');
        });
    }
    // Sincronizar portada al guardar formulario (por si hay blob pendiente)
    const btnGuardarBorrador = document.getElementById('guardar-borrador');
    if (btnGuardarBorrador) {
        btnGuardarBorrador.addEventListener('click', function() {
            if (window.portadaBlobPendiente && inputImagenOculto && inputImagenOculto.files.length === 0) {
                const dt = new DataTransfer();
                dt.items.add(new File([window.portadaBlobPendiente], 'portada.jpg', {type: 'image/jpeg'}));
                inputImagenOculto.files = dt.files;
            }
            if (inputImagenOculto && inputImagenOculto.files.length === 0 && window.portadaBlobPendiente) {
                alert('Debes pulsar "Guardar" en el recorte de portada para adjuntar la imagen.');
            }
            // Feedback visual tras guardar (esperar respuesta AJAX del backend)
            setTimeout(()=>{
                const formApariencia = document.getElementById('form-actualizar-info');
                if (formApariencia) {
                    formApariencia.addEventListener('ajax:success', function(e) {
                        mostrarMensajeFlotante('Portada guardada correctamente', 'success');
                    });
                    formApariencia.addEventListener('ajax:error', function(e) {
                        mostrarMensajeFlotante('Error al guardar la portada', 'error');
                    });
                }
            }, 100);
        });
    }

    // Función para (re)asignar el click a la portada
    function asignarClickPortada() {
        const portada = document.getElementById('portada-interactiva');
        if (portada && modalPortada) {
            portada.onclick = function() {
                modalPortada.classList.add('visible');
                modalPortada.style.display = 'flex';
            };
        }
    }
    asignarClickPortada();

    // Utilidad: mensaje flotante
    function mostrarMensajeFlotante(texto, tipo = 'success') {
        const msg = document.createElement('div');
        msg.className = 'floating-success-message floating-success-message-' + tipo;
        msg.innerHTML = `<i class="fa-solid fa-${tipo === 'success' ? 'check-circle' : 'times-circle'}"></i> ${texto}`;
        document.body.appendChild(msg);
        setTimeout(() => { msg.remove(); }, 3000);
    }
});
