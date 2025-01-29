from io import BytesIO
from django.shortcuts import render
from django.http import JsonResponse,HttpResponseBadRequest,HttpResponse
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


def generar_codigo():
    caracteres = '0123456789'  # Solo dígitos
    codigo = ''.join(random.choices(caracteres, k=10))
    return codigo


def codigo_es_duplicado(codigo):
    return ProtocoloSolicitud.objects.filter(codigo=codigo).exists()

def crear_protocolo(request):
    if request.method == "POST":
        archivo_adjunto = request.FILES.get('archivo_adjunto', None)

        nombre_solicitante = request.POST['nombre_solicitante']
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

        
        # nuevo_codigo = generar_codigo()
        # while codigo_es_duplicado(nuevo_codigo):
        #     nuevo_codigo = generar_codigo()

        # Protocolo.codigo = nuevo_codigo
        Protocolo.save()
        Protocolo.codigo = str(Protocolo.id)

        archivos_adjuntos = request.FILES.getlist('archivo')
        if archivo_adjunto:
            cuerpo_mensaje = (
                    'Se ha generado una nueva ficha con el código: ' + Protocolo.codigo + 
                    '. Adjunto el archivo PDF correspondiente.'
                )
        else:
                cuerpo_mensaje = (
                    'Se ha generado una nueva ficha con el código: ' + Protocolo.codigo + 
                    '. Adjunto el PDF correspondiente.'
                )
        if archivos_adjuntos:
            for archivo in archivos_adjuntos:
                ArchivoProtocolo.objects.create(protocolo=Protocolo, archivo=archivo)

        # Crear un buffer de memoria para el PDF
        buffer = BytesIO()
        # Crear un objeto de tipo SimpleDocTemplate con el buffer y el tamaño de página deseado (en este caso, carta)
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # # Crear una lista con los elementos que se agregarán al PDF
        elementos = []
        logo = Image('media/assets/image/logosig.png', width=120, height=60)
        # Agregar el espacio a la lista de elementos
        tabla = Table([['', logo, "                                      N° Orden de Trabajo:\n                                      (Uso Interno SIG)", "                           "]])
        # Agregar estilos a la tabla
        tabla.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                    ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                                    ('LEFTPADDING', (1, 0), (1, -1), -60),
                                    ('TOPPADDING', (0, 0), (-1, -1), -22),
                                    ('BOTTOMPADDING', (0, 0), (-1, -1), -10),
                                    ('INNERGRID', (3, 0), (3, 0), 0.25, colors.black),
                                    ('BOX', (3, 0), (3, 1), 0.25, colors.black),
                                    ('ROWSPAN', (0, 0), (0, 1), 2),
                                    ]))
                                    
        elementos.append(tabla)
        # Agregar un logo al PDF
       
        elementos.append(Spacer(1, 0.1 * inch))
        # Agregar un título al PDF
        estilo_titulo = getSampleStyleSheet()["Title"]
        titulo = Paragraph("Protocolo Traspaso Datos Geoespaciales", estilo_titulo)
        
        # Crear un espacio horizontal entre el logo y el título
        
        tabla = Table([[titulo]])
        
        tabla.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))

        # Agregar los datos de la solicitud al PDF
        
        elementos.append(tabla)

        elementos.append(Spacer(1, 0.1 * inch))
        
        estilo_parrafo = ParagraphStyle(name='Normal', fontSize=8, leading=10)
        # Obtener una instancia de los estilos de párrafo de muestra
        sample_styles = getSampleStyleSheet()

        # Crear un nuevo estilo de párrafo para el texto del código
        codigo_style = sample_styles["Normal"]
        codigo_style.fontSize = 20  # Tamaño de fuente diferente
        codigo_style.leading = 56  # Interlineado diferente

        # Crear el párrafo para el texto del código con el nuevo estilo
        texto_codigo = Protocolo.codigo
        # Crear el texto completo del subtitulo con el texto del código
        subtitulo_texto = "Para revisar su estado debe ir a gestion de tiempo, su código es <b>" + texto_codigo + "</b>"

        # Crear el párrafo con el texto completo y el estilo del subtitulo
        subtitulo = Paragraph(subtitulo_texto, estilo_parrafo)

        # Agregar el párrafo al elemento
        elementos.append(subtitulo)

        # Agregar un espacio vertical despu1és del párrafo del código
        elementos.append(Spacer(1, 0.1 * inch))
        
        # Crear un estilo de párrafo
        
        # Dividir el texto en varias líneas
        texto_objetivos = Protocolo.objetivos
        texto_direccion = Protocolo.direccion
        texto_despartamento = Protocolo.departamento
        texto_proyecto = Protocolo.nombre_proyecto
        texto_nombre = Protocolo.nombre_solicitante
        texto_corre_solicitante = Protocolo.corre_solicitante
        texto_area = Protocolo.area
        texto_insumo = Protocolo.insumo
        texto_producto = Protocolo.producto
        texto_cambio = Protocolo.cambios_posible

        parrafo_despartamento = Paragraph(texto_despartamento, estilo_parrafo, bulletText='')
        parrafo_direccion = Paragraph(texto_direccion, estilo_parrafo, bulletText='')
        parrafo_objetivos = Paragraph(texto_objetivos, estilo_parrafo, bulletText='')
        parrafo_proyecto = Paragraph(texto_proyecto, estilo_parrafo, bulletText='')
        parrafo_nombre = Paragraph(texto_nombre, estilo_parrafo, bulletText='')
        parrafo_correo = Paragraph(texto_corre_solicitante, estilo_parrafo, bulletText='')
        parrafo_area = Paragraph(texto_area, estilo_parrafo, bulletText='')
        parrafo_insumo = Paragraph(texto_insumo, estilo_parrafo, bulletText='')
        parrafo_producto = Paragraph(texto_producto, estilo_parrafo, bulletText='')
        parrafo_cambio = Paragraph(texto_cambio, estilo_parrafo, bulletText='')


        fecha_actual = datetime.now()
        # Obtener solo la fecha (año, mes, día)
        fecha = fecha_actual.strftime('%Y-%m-%d')

        # Crear una tabla con los datos de la solicitud
        datos = [
            ["Fecha de la solicitud", fecha],
            ["Direccion", parrafo_direccion],
            ["Departamento o Unidad Responsable", parrafo_despartamento],
            ["Nombre del solicitante", parrafo_nombre],
            ["Nombre del proyecto", parrafo_proyecto],
            ["Correo del solicitante",parrafo_correo],
            ["Área de estudio o intervencion (Cerro,Sector,UV,etc.)", parrafo_area],
            ["Objetivos de las solicitud ", parrafo_objetivos],
            ["Insumo solicitado y formato (KMZ, SHAPE, CAD, EXCEL,\n DESARROLLO ARCGIS ONLINE)\n"+
            "(Formulario Digital, cuadro de mando, Planos Digitales,\n Planos Impresos,  Aplicacion web y otra\n herramientas territoriales.) (previa a la Reunion)\n"
            + "Para los archivos KMZ, SHAPE y CAD\n sólo se puede entregar la información \nde una porción del territorio."
             , parrafo_insumo],
            ["Producto (ESTUDIO, INFORME, TABLA, PLANO\nU OTROSQUE DERIVIRAN DE LA \nINFORMACION ENTREGADA.)", parrafo_producto],
            ["Posibles cambios en el Insumo Entregado  ", parrafo_cambio]
        ]
        tabla = Table(datos,colWidths=[letter[0]*0.9/2]*2)
        # Aplicar un estilo a la tabla
        estilo_tabla = TableStyle([
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ])
        # Agregar más elementos al PDF según sea necesario
        tabla.setStyle(estilo_tabla)
        elementos.append(tabla)
        # Agregar más elementos al PDF según sea necesario
        
        tabla2 = Table([["V° B°\n Jefatura Directa", "V° B°\nDepartamento SIG"]],colWidths=[letter[0]*0.9/2]*2)
        tabla2.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 43),
        ]))
        elementos.append(tabla2)

        # Construir el PDF y enviarlo como respuesta al usuario
        doc.build(elementos)


        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        
        # Generar un nombre de archivo único utilizando un identificador UUID
        nombre_archivo = f"protocolo_{uuid.uuid4()}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
        

        # # Después de guardar la ficha
        Protocolo.save()

        # # Obtén los datos necesarios para el correo
        # correo_destino1 = 'deisy.pereira@munivalpo.cl' 
        # correo_destino2 = request.POST['corre_solicitante']  # Asegúrate de que esto sea una cadena y no una tupla
        # asunto = 'Nueva ficha generada'

        # # Construye el mensaje de correo
        # mensaje = MIMEMultipart()
        # mensaje['From'] = 'departamento.sig@munivalpo.cl'  
        # mensaje['To'] = ', '.join([correo_destino1, correo_destino2])
        # mensaje['Subject'] = asunto

        # # Cuerpo del mensaje
        # cuerpo_mensaje = cuerpo_mensaje# Asegúrate de definir el cuerpo del mensaje
        # mensaje.attach(MIMEText(cuerpo_mensaje, 'plain'))

        # # Adjunta el PDF al mensaje de correo
        # archivo_pdf = buffer.getvalue()

        # pdf_adjunto = MIMEApplication(archivo_pdf)
        # pdf_adjunto.add_header('Content-Disposition', 'attachment', filename='Ficha_de_protocolo.pdf')
        # mensaje.attach(pdf_adjunto)

        # # Configura el servidor SMTP
        # smtp_server = 'mail.munivalpo.cl'  # Cambia esto según tu proveedor de correo
        # smtp_port = 587    # Puerto de Gmail para TLS
        # smtp_usuario = 'servervalpo\\departamento.sig'  # Tu dirección de correo
        # smtp_contrasena = 'deptosig2024!'  # Tu contraseña de correo

        # # Inicia la conexión con el servidor SMTP
        # server = smtplib.SMTP(smtp_server, smtp_port)
        # server.starttls()

        # # Inicia sesión en tu cuenta de correo
        # server.login(smtp_usuario, smtp_contrasena)

        # # Envía el correo electrónico
        # to_addresses = [correo_destino1, correo_destino2]

        # server.sendmail("departamento.sig@munivalpo.cl", to_addresses, mensaje.as_string())

        # # Cierra la conexión con el servidor SMTP
        # server.quit()


        return response
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
        Protocolo.codigo = str(Protocolo.id)
        # Crear un buffer de memoria para el PDF
        buffer = BytesIO()
        # Crear un objeto de tipo SimpleDocTemplate con el buffer y el tamaño de página deseado (en este caso, carta)
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # # Crear una lista con los elementos que se agregarán al PDF
        elementos = []
        logo = Image('media/assets/image/logosig.png', width=120, height=60)
        # Agregar el espacio a la lista de elementos
        tabla = Table([['', logo, "                                      N° Orden de Trabajo:\n                                      (Uso Interno SIG)", "                           "]])
        # Agregar estilos a la tabla
        tabla.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                    ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                                    ('LEFTPADDING', (1, 0), (1, -1), -60),
                                    ('TOPPADDING', (0, 0), (-1, -1), -22),
                                    ('BOTTOMPADDING', (0, 0), (-1, -1), -10),
                                    ('INNERGRID', (3, 0), (3, 0), 0.25, colors.black),
                                    ('BOX', (3, 0), (3, 1), 0.25, colors.black),
                                    ('ROWSPAN', (0, 0), (0, 1), 2),
                                    ]))
                                    
        elementos.append(tabla)
        # Agregar un logo al PDF
       
        elementos.append(Spacer(1, 0.1 * inch))
        # Agregar un título al PDF
        estilo_titulo = getSampleStyleSheet()["Title"]
        titulo = Paragraph("Protocolo Traspaso Datos Geoespaciales", estilo_titulo)
        
        # Crear un espacio horizontal entre el logo y el título
        
        tabla = Table([[titulo]])
        
        tabla.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))

        # Agregar los datos de la solicitud al PDF
        
        elementos.append(tabla)

        elementos.append(Spacer(1, 0.1 * inch))
        
        estilo_parrafo = ParagraphStyle(name='Normal', fontSize=8, leading=10)
        # Obtener una instancia de los estilos de párrafo de muestra
        sample_styles = getSampleStyleSheet()

        # Crear un nuevo estilo de párrafo para el texto del código
        codigo_style = sample_styles["Normal"]
        codigo_style.fontSize = 20  # Tamaño de fuente diferente
        codigo_style.leading = 56  # Interlineado diferente

        # Crear el párrafo para el texto del código con el nuevo estilo
        texto_codigo = Protocolo.codigo
        # Crear el texto completo del subtitulo con el texto del código
        subtitulo_texto = "Para revisar su estado debe ir a gestion de tiempo, su código es <b>" + texto_codigo + "</b>"

        # Crear el párrafo con el texto completo y el estilo del subtitulo
        subtitulo = Paragraph(subtitulo_texto, estilo_parrafo)

        # Agregar el párrafo al elemento
        elementos.append(subtitulo)

        # Agregar un espacio vertical despu1és del párrafo del código
        elementos.append(Spacer(1, 0.1 * inch))
        
        # Crear un estilo de párrafo
        
        # Dividir el texto en varias líneas
        texto_objetivos = Protocolo.objetivos
        texto_direccion = Protocolo.direccion
        texto_despartamento = Protocolo.departamento
        texto_proyecto = Protocolo.nombre_proyecto
        texto_nombre = Protocolo.nombre_solicitante
        texto_corre_solicitante = Protocolo.corre_solicitante
        texto_area = Protocolo.area
        texto_insumo = Protocolo.insumo
        texto_producto = Protocolo.producto
        texto_cambio = Protocolo.cambios_posible

        parrafo_despartamento = Paragraph(texto_despartamento, estilo_parrafo, bulletText='')
        parrafo_direccion = Paragraph(texto_direccion, estilo_parrafo, bulletText='')
        parrafo_objetivos = Paragraph(texto_objetivos, estilo_parrafo, bulletText='')
        parrafo_proyecto = Paragraph(texto_proyecto, estilo_parrafo, bulletText='')
        parrafo_nombre = Paragraph(texto_nombre, estilo_parrafo, bulletText='')
        parrafo_correo = Paragraph(texto_corre_solicitante, estilo_parrafo, bulletText='')
        parrafo_area = Paragraph(texto_area, estilo_parrafo, bulletText='')
        parrafo_insumo = Paragraph(texto_insumo, estilo_parrafo, bulletText='')
        parrafo_producto = Paragraph(texto_producto, estilo_parrafo, bulletText='')
        parrafo_cambio = Paragraph(texto_cambio, estilo_parrafo, bulletText='')


        fecha_actual = Protocolo.fecha
        # Obtener solo la fecha (año, mes, día)
        fecha = fecha_actual.strftime('%Y-%m-%d')

        # Crear una tabla con los datos de la solicitud
        datos = [
            ["Fecha de la solicitud", fecha],
            ["Direccion", parrafo_direccion],
            ["Departamento o Unidad Responsable", parrafo_despartamento],
            ["Nombre del solicitante", parrafo_nombre],
            ["Nombre del proyecto", parrafo_proyecto],
            ["Correo del solicitante",parrafo_correo],
            ["Área de estudio o intervencion (Cerro,Sector,UV,etc.)", parrafo_area],
            ["Objetivos de las solicitud ", parrafo_objetivos],
            ["Insumo solicitado y formato (KMZ, SHAPE, CAD, EXCEL,\n DESARROLLO ARCGIS ONLINE)\n"+
            "(Formulario Digital, cuadro de mando, Planos Digitales,\n Planos Impresos,  Aplicacion web y otra\n herramientas territoriales.) (previa a la Reunion)\n"
            + "Para los archivos KMZ, SHAPE y CAD\n sólo se puede entregar la información \nde una porción del territorio."
             , parrafo_insumo],
            ["Producto (ESTUDIO, INFORME, TABLA, PLANO\nU OTROSQUE DERIVIRAN DE LA \nINFORMACION ENTREGADA.)", parrafo_producto],
            ["Posibles cambios en el Insumo Entregado  ", parrafo_cambio]
        ]
        tabla = Table(datos,colWidths=[letter[0]*0.9/2]*2)
        # Aplicar un estilo a la tabla
        estilo_tabla = TableStyle([
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("TEXTCOLOR", (0, 1), (-1, -1), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ])
        # Agregar más elementos al PDF según sea necesario
        tabla.setStyle(estilo_tabla)
        elementos.append(tabla)
        # Agregar más elementos al PDF según sea necesario
        
        tabla2 = Table([["V° B°\n Jefatura Directa", "V° B°\nDepartamento SIG"]],colWidths=[letter[0]*0.9/2]*2)
        tabla2.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 43),
        ]))
        elementos.append(tabla2)

        # Construir el PDF y enviarlo como respuesta al usuario
        doc.build(elementos)


        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        
        # Generar un nombre de archivo único utilizando un identificador UUID
        nombre_archivo = f"protocolo_{uuid.uuid4()}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{nombre_archivo}"'
        
        return response