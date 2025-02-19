from io import BytesIO
from django.shortcuts import render
from django.http import FileResponse, JsonResponse,HttpResponseBadRequest,HttpResponse
from django.contrib.auth.decorators import login_required
from datetime import datetime
from datetime import date
from .models import *
from .forms import CrearFormulario
import pytz
import uuid

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

# CREACION DE PDF.
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer,Image
from reportlab.lib.units import inch,mm
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
import random
import string
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from control_creacion_usuario.pdf_generator import *

def generar_codigo():
    caracteres = '0123456789'  # Solo dígitos
    codigo = ''.join(random.choices(caracteres, k=10))
    return codigo


def codigo_es_duplicado(codigo):
    return ProtocoloSolicitud.objects.filter(codigo=codigo).exists()

def crear_protocolo(request):
    if request.method == "POST":
        archivo_adjunto = request.FILES.get('archivo_adjunto', None)

        Protocolo =  ProtocoloSolicitud(
        direccion = request.POST['direccion'],
        departamento = request.POST['departamento'],
        nombre_solicitante = request.POST['nombre_solicitante'].title(),
        nombre_proyecto = request.POST['nombre_proyecto'],
        corre_solicitante = request.POST['corre_solicitante'],
        area = request.POST['area'],
        objetivos = request.POST['objetivos'],
        insumo = request.POST['insumo'],
        producto = request.POST['producto'],
        cambios_posible = request.POST['cambios_posible'],        
        )

        Protocolo.save()
        Protocolo.codigo = str(Protocolo.id)

        data ={
             'Protocolo':Protocolo,
        }

        nombre_ficha = "Solicitud" + str(Protocolo.id) + "_" + str(Protocolo)

        file_name, status = save_pdf_3(data, nombre_ficha)

        if not status:
            print("----------------")
            print("Error al generar PDF")
            print("----------------")
            return HttpResponse("Error al generar PDF")

        nombre_archivo = nombre_ficha + ".pdf"
        Protocolo.save()

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "solicitudes",
            {"type": "send_update", "message": "actualizar"}
        )

        nombre_archivo = nombre_ficha + ".pdf"
        
        return FileResponse(open(file_name, 'rb'), content_type='application/pdf', filename=nombre_archivo, as_attachment=True)

    return render(request,'formulario.html',{
            'forms':CrearFormulario()})
def vista_previa(resquest,id):

    protocolo = ProtocoloSolicitud.objects.get(id=id)
    fecha_actual = protocolo.fecha
    fecha = fecha_actual.strftime('%Y-%m-%d')
    archivos_adjuntos = ArchivoProtocolo.objects.filter(protocolo=protocolo)
    archivos_adjuntos_urls = [archivo.archivo.url for archivo in archivos_adjuntos]

    print(archivos_adjuntos_urls)
    data = {
        'id': protocolo.id,
        'fecha': fecha,
        'nombre_solicitante': protocolo.nombre_solicitante,
        'nombre_proyecto': protocolo.nombre_proyecto,
        'corre_solicitante': protocolo.corre_solicitante,
        'departamento': protocolo.departamento,
        'direccion': protocolo.direccion,
        'area': protocolo.area,
        'objetivos': protocolo.objetivos,
        'insumo': protocolo.insumo,
        'productos': protocolo.producto,
        'Cambios': protocolo.cambios_posible,
        'codigo': protocolo.codigo,
        'archivos_adjuntos_urls': archivos_adjuntos_urls,
    }
    
    return JsonResponse(data)

def descargar_pdf(request,id):
        Protocolo = ProtocoloSolicitud.objects.get(id = id)

        data ={
             'Protocolo':Protocolo,
        }

        nombre_ficha = "Solicitud" + str(Protocolo.id) + "_" + str(Protocolo)

        file_name, status = save_pdf_3(data, nombre_ficha)

        if not status:
            print("----------------")
            print("Error al generar PDF")
            print("----------------")
            return HttpResponse("Error al generar PDF")

        nombre_archivo = nombre_ficha + ".pdf"
        
        return FileResponse(open(file_name, 'rb'), content_type='application/pdf', filename=nombre_archivo, as_attachment=True)
