from email.mime.image import MIMEImage
import json
from django.contrib.auth.models import User
from django.contrib.auth import authenticate,update_session_auth_hash, login as auth_login, logout as auth_logout
from django.contrib.auth.models import User
from django.http import HttpResponse,JsonResponse
from formulario.models import ProtocoloSolicitud,Registro_designio
from django.utils import timezone
# Create your views here.
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404 
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from formulario.models import *
from django.db.models import F
import os
import smtplib
from smtplib import *
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import pytz
from email.utils import encode_rfc2231
from django.core.files.storage import default_storage
from django.utils.html import escape
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .pdf_generator import *
from tareas.models import *
from django.db import transaction

def Calculor_de_trabajo():

    total_ejecutado = ProtocoloSolicitud.objects.filter(
    estado="EJECUTADO",
    fecha_D__isnull=False).count()

    print("Número total de solicitudes válidas:", total_ejecutado)


    total_ejecutado_a_tiempo = ProtocoloSolicitud.objects.filter(
        estado="EJECUTADO",
        fecha_D__isnull=False,
        fecha_T__isnull=False,                                        
        fecha_T__lte=F('fecha_L')  # fecha_T menor o igual que fecha_L
    ).count()

    print("Número total de solicitudes válidas a tiempo:", total_ejecutado_a_tiempo)


    solicitudes = ProtocoloSolicitud.objects.filter(
        estado="EJECUTADO",
        fecha_D__isnull=False,
        fecha_T__isnull=False
    )

    # Calcular el total de segundos
    total_dias = 0
    for s in solicitudes:
        diferencia = s.fecha_D  -  s.fecha_T # Restar los DateTimeField, obteniendo un timedelta
        total_dias += round(diferencia.total_seconds() / 86400, 3)  # Convertir segundos a días y limitar a 3 decimales

    total_dias = round(total_dias,3)
    print("Total de días entre fecha_D y fecha_T:", total_dias)


            
    if total_ejecutado > 0:
        tpr = total_ejecutado /  total_dias
        tpr = round(tpr,3)

    else:
        tpr = 0  # Evitar división por cero si no hay solicitudes ejecutadas

    print("Tiempo Promedio de Resolución (TPR) en Dias:", tpr)

    if total_ejecutado_a_tiempo > 0:
        tdc = (total_ejecutado /   total_ejecutado_a_tiempo )*100
        tdc = round(tdc,3)

    else:
        tdc = 0

    print("Tasa de cumplimiento:", tdc)

    return tdc,tpr


def encotra_contraseña(usuario, tipo='munivalpo'):
    """
    tipo: 'munivalpo' o 'gmail'
    """
    secrets_file_path = 'pass.txt'

    with open(secrets_file_path, 'r') as file:
        secrets = file.readlines()

    for secret in secrets:
        partes = secret.strip().split(':')
        if len(partes) >= 2 and partes[0] == usuario:
            if tipo == 'munivalpo':
                return partes[1]  # Contraseña municipal
            elif tipo == 'gmail' and len(partes) >= 3:
                return partes[2]  # Contraseña Gmail
    return None



@csrf_exempt
def obtener_nota(request):
    protocolo_id = request.GET.get("protocolo_id")

    if not protocolo_id:
        return JsonResponse({"error": "Protocolo no encontrado"}, status=400)

    try:
        protocolo = ProtocoloSolicitud.objects.get(id=protocolo_id)
        apoyos = Apoyo_Protocolo.objects.filter(protocolo=protocolo)

        # Obtener valores en formato 1-100 (convertir de 0.XX a XX)
        porcentaje_total = (protocolo.valor_de_trabajo or 0) * 100
        porcentaje_profesional = (protocolo.valor_de_trabajo_funcionario or 0) * 100
        porcentaje_apoyo = sum(
            apoyo.valor_de_trabajo if apoyo.valor_de_trabajo is not None else 0
            for apoyo in apoyos
        ) * 100

        # Construir respuesta JSON
        apoyo_data = [
            {
                "id": apoyo.profesional.id,
                "first_name": apoyo.profesional.first_name,
                "last_name": apoyo.profesional.last_name,
                "ya_agregado": True
            }
            for apoyo in apoyos
        ]

        return JsonResponse({
            "porcentaje_total": int(porcentaje_total),  # Convertir a entero
            "porcentaje_profesional": int(porcentaje_profesional),  # Convertir a entero
            "porcentaje_apoyo": int(porcentaje_apoyo),  # Convertir a entero
            "apoyos": apoyo_data
        })

    except ProtocoloSolicitud.DoesNotExist:
        return JsonResponse({"error": "Protocolo no encontrado"}, status=404)

@csrf_exempt
def detalle_solicitud(request, solicitud_id):
    solicitud = get_object_or_404(ProtocoloSolicitud, id=solicitud_id)

    data = {
        'id': solicitud.id,
        'nombre_solicitante': solicitud.nombre_solicitante,
        'fecha': solicitud.fecha.strftime('%Y-%m-%d %H:%M:%S') if solicitud.fecha else 'No disponible',
        'departamento': solicitud.departamento,
        'estado': solicitud.estado,
        'numero_designios': solicitud.registro_designio_set.count(),  # Contar los registros relacionados
        'dias_restantes': "Sin fecha límite" if not solicitud.fecha_T else "Trabajo terminado" if solicitud.fecha_T else "En proceso"
    }

    return JsonResponse(data)

@csrf_exempt  # Deshabilita CSRF solo para pruebas (en producción usa @csrf_protect y pasa el token en AJAX)
def guardar_nota(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            protocolo_id = data.get("protocolo_id")
            porcentaje_total = float(data.get("porcentaje_total")) / 100  # Convertir 100% -> 1.0
            porcentaje_profesional = float(data.get("porcentaje_profesional")) / 100  # Convertir 100% -> 1.0
            porcentaje_apoyo = float(data.get("porcentaje_apoyo")) / 100  # Convertir 100% -> 1.0
            apoyos_ids = data.get("apoyos", [])  # Lista de IDs de usuarios seleccionados como apoyo
            print("Apoyos:", apoyos_ids)
            # Buscar el protocolo
            protocolo = ProtocoloSolicitud.objects.get(id=protocolo_id)

            # Verificar que la distribución es válida
            if porcentaje_profesional + porcentaje_apoyo > porcentaje_total:
                return JsonResponse({"success": False, "error": "La distribución de trabajo no puede exceder el total asignado"}, status=400)

            # Guardar el nuevo valor en ProtocoloSolicitud
            protocolo.valor_de_trabajo = porcentaje_total
            protocolo.valor_de_trabajo_funcionario = porcentaje_profesional
            protocolo.puntaje = 1 * porcentaje_profesional
            protocolo.save()


            # Si hay apoyos, guardar los valores distribuidos
            apoyos = Apoyo_Protocolo.objects.filter(protocolo=protocolo)
            total_apoyos = apoyos.count()

            if total_apoyos > 0 and porcentaje_apoyo > 0:
                valor_por_apoyo = porcentaje_apoyo / total_apoyos

                for apoyo in apoyos:
                    apoyo.valor_de_trabajo = valor_por_apoyo
                    apoyo.puntaje = valor_por_apoyo  # Multiplicado por 1
                    apoyo.save()



            return JsonResponse({"success": True, "message": "Datos guardados correctamente"})

        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({"success": False, "error": "Protocolo no encontrado"}, status=404)
        except User.DoesNotExist:
            return JsonResponse({"success": False, "error": "Usuario de apoyo no encontrado"}, status=404)
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    
    return JsonResponse({"error": "Método no permitido"}, status=405)


def solicitud_express(request):
    if request.method == "POST":
        try:
            with transaction.atomic():
                Protocolo = ProtocoloSolicitud.objects.create(
                    direccion=request.POST['direccion'],
                    departamento=request.POST['departamento'],
                    nombre_solicitante=request.POST['nombre_solicitante'].title(),
                    nombre_proyecto=request.POST['nombre_proyecto'],
                    corre_solicitante=request.POST['corre_solicitante'],
                    area=request.POST['area'],
                    objetivos=request.POST['objetivos'],
                    cambios_posible=request.POST['cambios_posible'],
                    anexo=request.POST['anexo'],
                )
                archivos_adjuntos = request.FILES.getlist('archivo')
                if archivos_adjuntos:
                    for archivo in archivos_adjuntos:
                        ArchivoProtocolo.objects.create(protocolo=Protocolo, archivo=archivo)


                insumo_ids = [int(insumo.split('_')[1]) for insumo in request.POST.getlist('insumo') if insumo.startswith('insumo_')]
                
                if not insumo_ids:
                    print("No se seleccionaron insumos válidos.")
                    return HttpResponse("No se seleccionaron insumos válidos.", status=400)

                insumos_a_guardar = []
                for insumo_id in insumo_ids:
                    try:
                        insumo = Insumo.objects.get(id=insumo_id)
                        print(f"Insumo encontrado con ID {insumo_id}: {insumo}")
                    except Insumo.DoesNotExist:
                        print(f"Insumo con ID {insumo_id} no encontrado, creando nuevo insumo.")
                        insumo = Insumo.objects.create(id=insumo_id, nombre=f"Insumo {insumo_id}")
                    insumos_a_guardar.append(insumo)

                Protocolo.insumo.set(insumos_a_guardar)

                producto_ids = [int(producto.split('_')[1]) for producto in request.POST.getlist('producto') if producto.startswith('producto_')]
                print("Producto IDs extraídos:", producto_ids)
                
                Protocolo.codigo = str(Protocolo.id)
                Protocolo.save()

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    "solicitudes",
                    {"type": "send_update", "message": "actualizar"}
                )


            archivos_adjuntos = request.FILES.getlist('archivo')
            for archivo in archivos_adjuntos:
                ArchivoProtocolo.objects.create(protocolo=Protocolo, archivo=archivo)

            
            return JsonResponse({'success': True, 'message': 'Se creó la solicitud correctamente'})

        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Error al crear una solicitud: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)

def usuarios_disponibles(request):
    protocolo_id = request.GET.get('protocolo_id')

    try:
        protocolo = ProtocoloSolicitud.objects.get(id=protocolo_id)
        # Excluir el profesional asignado principal
        profesional_id = protocolo.profesional.id if protocolo.profesional else None

        # Obtener todos los usuarios, excluyendo el profesional principal
        usuarios = User.objects.exclude(id=profesional_id,) .values('id', 'first_name', 'last_name').exclude(acceso_pagina__acceso=True)

        # Obtener los apoyos ya registrados para este protocolo
        apoyo_qs = Apoyo_Protocolo.objects.filter(protocolo=protocolo)
        apoyo_user_ids = list(apoyo_qs.values_list('profesional_id', flat=True))

        usuarios_list = []
        for u in usuarios:
            u['ya_agregado'] = u['id'] in apoyo_user_ids
            usuarios_list.append(u)

        return JsonResponse({"usuarios": usuarios_list}, safe=False)

    except ProtocoloSolicitud.DoesNotExist:
        return JsonResponse({"error": "Protocolo no encontrado"}, status=404)

    
@csrf_exempt
def agregar_apoyo(request):
    if request.method == "POST":
        protocolo_id = request.POST.get("protocolo_id")
        usuarios_json = request.POST.get("usuarios", "[]")
        usuarios_ids = json.loads(usuarios_json)

        try:
            protocolo = ProtocoloSolicitud.objects.get(id=protocolo_id)

            # Obtiene todos los apoyos actuales para este protocolo
            apoyos_actuales = Apoyo_Protocolo.objects.filter(protocolo=protocolo)
            # Extrae los IDs de los usuarios que ya están asignados como apoyo
            apoyos_ids_actuales = list(apoyos_actuales.values_list('profesional_id', flat=True))

            # Elimina aquellos apoyos que ya no están en la lista seleccionada
            Apoyo_Protocolo.objects.filter(protocolo=protocolo).exclude(profesional_id__in=usuarios_ids).delete()

            # Agrega los nuevos apoyos que no existan ya
            for usuario_id in usuarios_ids:
                if usuario_id not in apoyos_ids_actuales:
                    usuario = User.objects.get(id=usuario_id)
                    Apoyo_Protocolo.objects.create(protocolo=protocolo, profesional=usuario)
            
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "solicitudes",
                {"type": "send_update", "message": "actualizar"}
            )

            return JsonResponse({"success": True})

        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({"error": "Protocolo no encontrado"}, status=404)
        except User.DoesNotExist:
            return JsonResponse({"error": "Algún usuario no se encontró"}, status=404)

    return JsonResponse({"error": "Método no permitido"}, status=405)


def apoyo_trabajo(request):
    protocolo_id = request.GET.get("protocolo_id")

    if not protocolo_id:
        return JsonResponse({"error": "Protocolo no encontrado"}, status=400)

    try:
        protocolo = ProtocoloSolicitud.objects.get(id=protocolo_id)
        apoyos = Apoyo_Protocolo.objects.filter(protocolo=protocolo)

        apoyo_data = [
            {
                "id": apoyo.profesional.id,
                "first_name": apoyo.profesional.first_name,
                "last_name": apoyo.profesional.last_name,
                "ya_agregado": True
            }
            for apoyo in apoyos
        ]

        return JsonResponse({"apoyos": apoyo_data})

    except ProtocoloSolicitud.DoesNotExist:
        return JsonResponse({"error": "Protocolo no encontrado"}, status=404)


def actualizar_limite_solicitud(request):
    if request.method == 'POST':
        if not request.user.is_superuser:
            return JsonResponse({'success': False, 'message': 'No tienes permisos para cambiar la carga de trabajo'}, status=403)

        solicitud_id = request.POST.get('id')
        nuevo_limite = request.POST.get('tipo_limite')

        try:
            solicitud = ProtocoloSolicitud.objects.get(id=solicitud_id)
            solicitud.tipo_limite = nuevo_limite
            solicitud.save()

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                    "solicitudes",
                    {"type": "send_update", "message": "actualizar"}
                )
            return JsonResponse({'success': True, 'message': 'Carga de trabajo actualizada correctamente'})
        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Solicitud no encontrada'})

    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)


@csrf_exempt
def resert_limite(request):
    if request.method == 'POST':
        try:
            import json
            data = json.loads(request.body)
            id_solicitud = data.get('id')
            solicitud = ProtocoloSolicitud.objects.get(id=id_solicitud)
            solicitud.tipo_limite = ''
            solicitud.fecha_L = None
            solicitud.save()


            return JsonResponse({'message': 'Solicitud reseteada con éxito.'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    return JsonResponse({'error': 'Método no permitido.'}, status=405)

def delegar_admin(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        updates = data.get('updates', [])

        for update in updates:
            user_id = update.get('user_id')
            is_superuser = update.get('is_superuser', False)

            try:
                user = User.objects.get(id=user_id)
                user.is_superuser = is_superuser
                user.save()
            
            except User.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': f'Usuario con ID {user_id} no encontrado.'}, status=404)
            
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
                "solicitudes",
                {"type": "send_update", "message": "actualizar"}
            )

        return JsonResponse({'status': 'success', 'message': 'Usuarios actualizados correctamente.'})

@csrf_exempt
def vista_previa_reaccinacion(request, id):
    # Obtener el protocolo solicitado
    protocoloS = ProtocoloSolicitud.objects.get(id=id)
    
    # Filtrar los registros relacionados con el protocolo
    reg = Registro_designio.objects.filter(protocolo=protocoloS.id)
    
    # Construir una lista con los datos de cada registro
    registros_data = [
        {
            "id": registro.id,
            "Motivo": registro.objetivos,
            "Fecha": registro.fecha.strftime('%Y-%m-%d'),
            "Profesional_N": registro.profesional.first_name,
            "Profesional_N_1": registro.profesional.last_name,

        }
        for registro in reg
    ]
    
    # Preparar la respuesta
    data = {
        "registros": registros_data,
    }
    
    return JsonResponse(data)

@csrf_exempt  # Solo usar esto si estás probando; para producción, configura CSRF correctamente
def Envio_de_correo(request):
    if request.method == 'POST':
        user = request.user
        email_input = request.POST.get('email', '').strip()

        # Convertir la entrada en una lista separando por comas, eliminando espacios y vacíos
        emails = [email.strip() for email in email_input.split(',') if email.strip()] if email_input else []

        archivos = request.FILES.getlist('files')
        total_size = sum(archivo.size for archivo in archivos)

        urls_archivos = []
        archivos_adjuntos = []
        dominio = f"{request.scheme}://{request.get_host()}"


        if user.is_superuser:
            try:
                # Obtener los datos
                message = request.POST.get('message', '')
                formatted_message = escape(message).replace("\n", "<br>")
                ficha_id = request.POST.get('ficha_id')
                Protocolo = ProtocoloSolicitud.objects.get(id=ficha_id)
                Protocolo.enviado_correo = True
                profesional = Protocolo.profesional
                Protocolo.estado = 'EN PROCESO'
                Protocolo.save()

                # Verificar el tamaño de los archivos
                if total_size > 10 * 1024 * 1024:  # Más de 10 MB
                    for archivo in archivos:
                        archivo_link = Archivo_Link.objects.create(protocolo=Protocolo, archivo=archivo)
                        url_relativa = default_storage.url(archivo_link.archivo.name)
                        urls_archivos.append(f"{dominio}{url_relativa}")

                else:  # Menor o igual a 10 MB
                    for archivo in archivos:
                        archivo_adjunto = MIMEApplication(archivo.read())
                        nombre_archivo = encode_rfc2231(archivo.name, 'utf-8')
                        archivo_adjunto.add_header(
                            'Content-Disposition',
                            'attachment',
                            filename=nombre_archivo
                        )
                        archivos_adjuntos.append(archivo_adjunto)

                # Generar PDF

                data = {
                    'Protocolo': Protocolo,
                }

                nombre_ficha = "Solicitud" + str(Protocolo.id) + "_" + str(Protocolo)

                # Generar el PDF
                pdf_path, status = save_pdf_3(data, nombre_ficha)

                # Leer el archivo generado en modo binario
                with open(pdf_path, "rb") as pdf_file:
                    archivo_pdf = pdf_file.read()

                # Configuración del correo
                superusers = User.objects.filter(is_superuser=True).exclude(username="osvaldo.moya").values_list('email', flat=True)
                superuser_emails = list(superusers)

                mi_correo = f'{user.username}@munivalpo.cl'.strip()
                asunto = f'Solicitud N°{Protocolo.codigo} Asignada'
                mensaje = MIMEMultipart()
                mensaje['From'] = mi_correo
                destinatarios = list(set([profesional.email] + emails))
                mensaje['To'] = ', '.join(destinatarios)
                mensaje['Subject'] = asunto

                bcc_destinatarios = [mi_correo]

                # Cargar la firma
                firma_path = os.path.join('media/assets/Firma', f'{user.username}.png')
                if os.path.exists(firma_path):
                    with open(firma_path, 'rb') as firma_file:
                        firma_img = MIMEImage(firma_file.read())
                        firma_img.add_header('Content-ID', '<firma>')
                        mensaje.attach(firma_img)

                # Generar el contenido HTML
                html_archivos = ""
                if urls_archivos:
                    html_archivos = f"""
                    <p>Los siguientes archivos superan el límite de 10 MB y están disponibles en los siguientes enlaces:</p>
                    <ul>
                        {''.join(f'<li><a href="{url}" target="_blank">{url}</a></li>' for url in urls_archivos)}
                    </ul>
                    """
                # else:
                #     html_archivos = "<p>Los archivos están adjuntos al correo.</p>"

                html_content = f"""
                <html>
                    <body>
                        <p>{formatted_message}</p>
                        <br>
                        {html_archivos}
                        <br>
                        <img src="cid:firma" alt="Firma" width="600" height="auto" />
                    </body>
                </html>
                """
                mensaje.attach(MIMEText(html_content, 'html'))

                # Adjuntar PDF
                pdf_adjunto = MIMEApplication(archivo_pdf)
                pdf_adjunto.add_header('Content-Disposition', 'attachment', filename='Ficha_de_protocolo.pdf')
                mensaje.attach(pdf_adjunto)

                # Adjuntar archivos menores a 10 MB
                for archivo_adjunto in archivos_adjuntos:
                    mensaje.attach(archivo_adjunto)

                # Configuración del servidor SMTP
                smtp_server = 'mail.munivalpo.cl'
                smtp_port = 587
                smtp_usuario = f'servervalpo\\{user.username}'
                smtp_contrasena = encotra_contraseña(user.username)

                # Enviar el correo
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(smtp_usuario, smtp_contrasena)
                server.sendmail(
                    mi_correo,
                    destinatarios + bcc_destinatarios,  # Incluir destinatarios normales y BCC
                    mensaje.as_string()
                )

                
                server.quit()
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                        "solicitudes",
                        {"type": "send_update", "message": "actualizar"}
                    )
                

                return JsonResponse({'success': True})
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()  # Obtiene el error detallado
                return JsonResponse({'success': False, 'error': str(e), 'traceback': error_trace}, status=555)


        else:
            try:
                message = request.POST.get('message', '')
                formatted_message = escape(message).replace("\n", "<br>")
                ficha_id = request.POST.get('ficha_id')
                Protocolo = ProtocoloSolicitud.objects.get(id=ficha_id)
                Protocolo.enviado_correo_t = True
                Protocolo.fecha_T = timezone.now()
                profesional = Protocolo.profesional
                Protocolo.estado = 'EJECUTADO'
                solicitante = Protocolo.corre_solicitante

                Protocolo.save()

                # Verificar el tamaño de los archivos
                if total_size > 10 * 1024 * 1024:  # Más de 10 MB
                    for archivo in archivos:
                        archivo_link = Archivo_Link.objects.create(protocolo=Protocolo, archivo=archivo)
                        url_relativa = default_storage.url(archivo_link.archivo.name)
                        urls_archivos.append(f"{dominio}{url_relativa}")

                else:  # Menor o igual a 10 MB
                    for archivo in archivos:
                        archivo_adjunto = MIMEApplication(archivo.read())
                        nombre_archivo = encode_rfc2231(archivo.name, 'utf-8')
                        archivo_adjunto.add_header(
                            'Content-Disposition',
                            'attachment',
                            filename=nombre_archivo
                        )
                        archivos_adjuntos.append(archivo_adjunto)

                # Generar PDF
                data = {
                    'Protocolo': Protocolo,
                }

                nombre_ficha = "Solicitud" + str(Protocolo.id) + "_" + str(Protocolo)

                # # Generar el PDF
                pdf_path, status = save_pdf_3(data, nombre_ficha)

                # # Leer el archivo generado en modo binario
                with open(pdf_path, "rb") as pdf_file:
                    archivo_pdf = pdf_file.read()


                if not status:
                    print("----------------")
                    print("Error al generar PDF")
                    print("----------------")
                    return HttpResponse("Error al generar PDF")

                # Configuración del correo
                superusers = User.objects.filter(is_superuser=True).exclude(username="osvaldo.moya").values_list('email', flat=True)
                superuser_emails = list(superusers)

                mi_correo = f'{user.username}@munivalpo.cl'.strip()
                asunto = f'Solicitud N°{Protocolo.codigo} Asignada'
                mensaje = MIMEMultipart()
                mensaje['From'] = mi_correo
                destinatarios = list(set([solicitante] + emails + superuser_emails))
                mensaje['To'] = ', '.join(destinatarios)
                mensaje['Subject'] = asunto

                bcc_destinatarios = [mi_correo]

                # Cargar la firma
                firma_path = os.path.join('media/assets/Firma', f'{user.username}.png')
                if os.path.exists(firma_path):
                    with open(firma_path, 'rb') as firma_file:
                        firma_img = MIMEImage(firma_file.read())
                        firma_img.add_header('Content-ID', '<firma>')
                        mensaje.attach(firma_img)

                # Generar el contenido HTML
                html_archivos = ""
                if urls_archivos:
                    html_archivos = f"""
                    <p>Los siguientes archivos superan el límite de 10 MB y están disponibles en los siguientes enlaces:</p>
                    <ul>
                        {''.join(f'<li><a href="{url}" target="_blank">{url}</a></li>' for url in urls_archivos)}
                    </ul>
                    """
                else:
                    html_archivos = "<p></p>"

                html_content = f"""
                <html>
                    <body>
                        <p>{formatted_message}</p>
                        <br>
                        {html_archivos}
                        <br>
                        <img src="cid:firma" alt="Firma" width="600" height="auto" />
                    </body>
                </html>
                """
                mensaje.attach(MIMEText(html_content, 'html'))

                # Adjuntar PDF
                pdf_adjunto = MIMEApplication(archivo_pdf)
                pdf_adjunto.add_header('Content-Disposition', 'attachment', filename='Ficha_de_protocolo.pdf')
                mensaje.attach(pdf_adjunto)

                # Adjuntar archivos menores a 10 MB
                for archivo_adjunto in archivos_adjuntos:
                    mensaje.attach(archivo_adjunto)

                # Configuración del servidor SMTP
                smtp_server = 'mail.munivalpo.cl'
                smtp_port = 587
                smtp_usuario = f'servervalpo\\{user.username}'
                smtp_contrasena = encotra_contraseña(user.username)

                # Enviar el correo
                server = smtplib.SMTP(smtp_server, smtp_port)
                server.starttls()
                server.login(smtp_usuario, smtp_contrasena)
                server.sendmail(
                    mi_correo,
                    destinatarios + bcc_destinatarios,  # Incluir destinatarios normales y BCC
                    mensaje.as_string()
                )
                server.quit()
                
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                        "solicitudes",
                        {"type": "send_update", "message": "actualizar"}
                    )

                return JsonResponse({'success': True})
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()  # Obtiene el error detallado
                return JsonResponse({'success': False, 'error': str(e), 'traceback': error_trace}, status=555)

                              
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)

@csrf_exempt
def actualizar_profesional(request):
    if request.method == 'POST':
        solicitud_id = request.POST.get('solicitud_id')
        nuevo_profesional_id = request.POST.get('profesional')
        motivo = request.POST.get('motivo')
        solicitud = get_object_or_404(ProtocoloSolicitud, id=solicitud_id)

        if not nuevo_profesional_id or not solicitud_id:
            return JsonResponse({'success': False, 'message': 'Necesita'})

        if solicitud.profesional:
            Reg = Registro_designio(
                objetivos = motivo,
                protocolo = solicitud,
                profesional = solicitud.profesional,
                
                )
            Reg.save()
            
        nuevo_profesional = get_object_or_404(User, id=nuevo_profesional_id)
        solicitud.profesional = nuevo_profesional
        solicitud.fecha_D = timezone.now()
        solicitud.save()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
                "solicitudes",
                {"type": "send_update", "message": "actualizar"}
            )
        return JsonResponse({'success': True})
    else:
        return JsonResponse({'success': False, 'message': 'Método no permitido'})

def calcular_fecha_limite(inicio, dias):
    fecha_limite = inicio
    dias_restantes = dias

    while dias_restantes > 0:
        fecha_limite += timedelta(days=1)
        if fecha_limite.weekday() < 5:  # Lunes=0, Domingo=6
            dias_restantes -= 1
    
    return fecha_limite

@csrf_exempt
def actualizar_limite(request):
    if request.method == 'POST':
        solicitud_id = request.POST.get('solicitud_id')
        tipo_limite = request.POST.get('nuevoLimite')
        fecha_completa = request.POST.get('fecha')  # Fecha completa enviada desde el frontend

        try:
            # Validar si la solicitud existe
            solicitud = ProtocoloSolicitud.objects.get(id=solicitud_id)

            if tipo_limite == 'P':
                if not fecha_completa:
                    return JsonResponse({'success': False, 'message': 'Debe proporcionar una fecha válida para el tipo P'})
                try:
                    # Convertir la fecha completa ISO 8601 a datetime
                    fecha_limite = datetime.strptime(fecha_completa, "%Y-%m-%dT%H:%M:%S.%fZ")
                    # Asegurarse de que sea consciente de la zona horaria UTC y convertir a la zona horaria local
                    fecha_limite = make_aware(fecha_limite, timezone=pytz.UTC)
                except ValueError:
                    return JsonResponse({'success': False, 'message': 'Formato de fecha inválido'})
            else:
                # Calcular los días límite según el tipo
                if tipo_limite == 'A':
                    dias_limite = 5
                elif tipo_limite == 'M':
                    dias_limite = 4
                elif tipo_limite == 'L':
                    dias_limite = 1
                else:
                    return JsonResponse({'success': False, 'message': 'Tipo de límite no reconocido'})

                # Calcular la fecha límite basada en días
                fecha_limite = calcular_fecha_limite(timezone.now(), dias_limite)

            # Actualizar la solicitud con el nuevo tipo de límite y fecha límite
            solicitud.tipo_limite = tipo_limite
            solicitud.fecha_L = fecha_limite
            solicitud.save()
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "solicitudes",
                {"type": "send_update", "message": "actualizar"}
            )

            return JsonResponse({'success': True, 'message': 'Límite actualizado correctamente'})

        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'La solicitud no existe'})

    return JsonResponse({'success': False, 'message': 'Método no permitido'})

@csrf_exempt
def actualizar_estado_solicitud(request):
    if request.method == 'POST':
        solicitud_id = request.POST.get('solicitud_id')
        nuevo_estado = request.POST.get('estado')

        try:
            solicitud = ProtocoloSolicitud.objects.get(id=solicitud_id)
            if nuevo_estado == "EJECUTADO" and solicitud.profesional:
                solicitud.estado = nuevo_estado
                solicitud.fecha_T = timezone.now()
                solicitud.save()
            elif nuevo_estado == "RECHAZADO":
                solicitud.estado = nuevo_estado
                solicitud.save()
            else:
                solicitud.estado = nuevo_estado
                solicitud.save()

            # 🔥 Notificar a WebSockets 🔥
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "solicitudes",
                {"type": "send_update", "message": "actualizar"}
            )

            return JsonResponse({'success': True, 'message': 'Estado actualizado correctamente'})

        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Solicitud no encontrada'})

    return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)