from django.shortcuts import render
from django.contrib.auth.decorators import login_required,user_passes_test
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.shortcuts import redirect
from django.contrib.auth.models import User
from django.http import HttpResponse,JsonResponse
from core.models import UserActivity
from formulario.models import ProtocoloSolicitud
from datetime import date
from openpyxl import Workbook
# Create your views here.
from django.views.decorators.csrf import csrf_exempt
from .forms import ImagenForm,PDFForm
from .models import Imagen_sig,PDF_sig
from django.shortcuts import get_object_or_404, redirect
from django.core.paginator import Paginator, Page

import os
def download_excel(request):
    # Crear un nuevo libro de trabajo de Excel y agregar datos
    workbook = Workbook()
    sheet = workbook.active
    sheet['A1'] = 'PAGINA'
    sheet['B1'] = 'DEPARTAMENTO'
    sheet['C1'] = 'MES-DIA-AÑO-HORA'

    sheet.column_dimensions['A'].width = 30  # Ancho de la columna B
    sheet.column_dimensions['B'].width = 50  # Ancho de la columna C
    sheet.column_dimensions['C'].width = 30  # Ancho de la columna C


    row = 2  # Fila inicial para los datos
    activities = UserActivity.objects.all()

    for activity in activities:
        sheet.cell(row=row, column=1).value = activity.page
        sheet.cell(row=row, column=2).value = activity.departamento
        sheet.cell(row=row, column=3).value = activity.timestamp.strftime('%m-%d-%Y-%H:%M')
        row += 1  # Incrementar la fila para el próximo registro
    # Configurar la respuesta HTTP con el archivo Excel adjunto
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename=Historial_de_visitas.xlsx'

    # Guardar el libro de trabajo en la respuesta HTTP
    workbook.save(response)

    return response
def Historial_Visitas(request):
    Historial = UserActivity.objects.all()
    data = {
    'historial': Historial,
    }
    return render(request,'Historial_Visitas.html',data)

def solicitude_llegadas(request):
    ESTADO = [
    ('RECIBIDO', 'RECIBIDO'),
    ('EN PROCESO', 'EN PROCESO'),
    ('EJECUTADO', 'EJECUTADO'),
    ('RECHAZADO', 'RECHAZADO')
    ]

    OPCIONES ={
        'ESTADO':ESTADO
    }
    data = {
        'OPCIONES':OPCIONES,
        'Solicitudes': ProtocoloSolicitud.objects.all(),
        }
    return render(request,'solicitude_llegadas.html',data)
def control(resquest):

    return render(resquest,'Control.html')


def Gestion_imagen(request):
    if request.method == 'POST':
        form = ImagenForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('Gestion_imagen')  # Redirige a la misma vista después de guardar la imagen
    else:
        form = ImagenForm()

    # Obtener todas las imágenes
    imagenes = Imagen_sig.objects.all()
    paginator = Paginator(imagenes, 6)  # Muestra 6 imágenes por página
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'Gestion_imagen.html', {'form': form, 'imagenes': imagenes,'page_obj': page_obj})

@csrf_exempt
def actualizar_estado(request):
    if request.method == 'POST':
        solicitud_id = request.POST.get('solicitud_id')
        nuevo_estado = request.POST.get('estado')

        # Actualizar el estado en la base de datos
        solicitud = ProtocoloSolicitud.objects.get(id=solicitud_id)
        solicitud.estado = nuevo_estado
        solicitud.save()

        return JsonResponse({'success': True})
    else:
        return JsonResponse({'success': False, 'message': 'Método no permitido'})
    

def eliminar_imagen(request, imagen_id):
    imagen = get_object_or_404(Imagen_sig, pk=imagen_id)
    
    if request.method == 'POST':
        # Guarda la ruta del archivo de la imagen
        ruta_archivo = imagen.archivo_adjunto.path
        # Elimina la imagen de la base de datos
        imagen.delete()
        # Elimina el archivo de la imagen del sistema de archivos
        if os.path.exists(ruta_archivo):
            os.remove(ruta_archivo)
        return redirect('Gestion_imagen')  # Redirige a la vista de gestión de imágenes después de eliminar la imagen
    
    return redirect('Gestion_imagen')  # Redirige a la vista de gestión de imágenes si la solicitud no es de tipo POST

def Gestion_pdf(request):
    if request.method == 'POST':
        form = PDFForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('Gestion_pdf')  # Redirige a la misma vista después de guardar la imagen
    else:
        form = PDFForm()

    # Obtener todas las imágenes
    pdf = PDF_sig.objects.all()
    paginator = Paginator(pdf, 6)  # Muestra 6 imágenes por página
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'Gestion_PDF.html', {'form': form, 'PDF': pdf,'page_obj': page_obj})
