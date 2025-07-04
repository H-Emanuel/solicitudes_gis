from django.shortcuts import render, redirect, get_object_or_404
from .models import Archivo
from .forms import ArchivoForm
import os
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate,update_session_auth_hash, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .forms import ArchivoForm
from .models import Archivo, Carpeta, PermisoCarpeta
from .models import Archivo, Carpeta, PermisoCarpeta
from django.contrib.auth.decorators import login_required
from pathlib import Path
from .models import Carpeta
from typing import List, Optional
from django.http import HttpResponse
from django.http import JsonResponse
import shutil
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect
from .models import Carpeta, Archivo
from django.urls import reverse
from urllib.parse import urlencode
from .models import acceso_pagina



@login_required

@login_required(login_url='/nube/login/')
def lista_archivos(request):
    carpeta_id = request.GET.get('carpeta')  # id de la carpeta actual
    carpeta_actual = None

    
    if carpeta_id:
        try:
            carpeta_actual = Carpeta.objects.get(
                id=carpeta_id,
                # 👇 si es privada, solo el dueño puede acceder
                **({'usuario': request.user} if not request.user.is_staff else {})
            )

            # Protección adicional si no es staff y la carpeta es privada pero de otro usuario
            if carpeta_actual.privada and carpeta_actual.usuario != request.user:
                carpeta_actual = None

        except Carpeta.DoesNotExist:
            carpeta_actual = None

    # Archivos de la carpeta actual (o raíz si no hay carpeta)
    archivos = Archivo.objects.filter(carpeta=carpeta_actual).order_by('-fecha_subida')

    # Subcarpetas de la carpeta actual
    subcarpetas = Carpeta.objects.filter(carpeta_padre=carpeta_actual, usuario=request.user)

    # URL absoluta para copiar enlace
    for archivo in archivos:
        archivo.url_absoluto = request.build_absolute_uri(archivo.archivo.url)

    context = {
        'carpeta_actual': carpeta_actual,
        'archivos': archivos,
        'subcarpetas': subcarpetas,
    }

    return render(request, 'lista.html', context)





def crear_estructura_desde_partes(partes, usuario):
    """
    Crea (o recupera) la jerarquía completa de carpetas dada una lista de nombres.
    Ejemplo: ['firma', 'firmas'] crea o recupera firma → firmas
    """
    carpeta_padre = None

    for nombre in partes:
        carpeta_padre, _ = Carpeta.objects.get_or_create(
            nombre=nombre,
            usuario=usuario,
            carpeta_padre=carpeta_padre
        )

    return carpeta_padre  # Carpeta final donde se debe guardar el archivo


@login_required
def subir_archivo_o_carpeta(request):
    if request.method == 'POST':
        archivos = request.FILES.getlist('archivos')
        rutas = request.POST.getlist('rutas')

        for archivo, ruta in zip(archivos, rutas):
            ruta_obj = Path(ruta)
            partes = ruta_obj.parts
            nombre_archivo = partes[-1]
            ruta_carpetas = partes[:-1]

            # Crear la estructura de carpetas
            carpeta_destino = crear_estructura_desde_partes(ruta_carpetas, request.user)

            # Guardar el archivo
            Archivo.objects.create(
                usuario=request.user,
                nombre=nombre_archivo,
                archivo=archivo,  # Django lo guardará en media/ según `ruta_archivo_completa`
                carpeta=carpeta_destino
            )

        return JsonResponse({'redirect_url': '/'})

    return render(request, 'subir.html')



@login_required
def eliminar_archivo(request, archivo_id):
    archivo = get_object_or_404(Archivo, pk=archivo_id)

    # Permitir solo al dueño o admin
    if archivo.usuario != request.user and not request.user.is_staff:
        return redirect('lista_archivos')

    carpeta = archivo.carpeta  # la guardamos antes de eliminar

    # Borrar archivo físico
    if archivo.archivo:
        archivo.archivo.delete(save=False)

    archivo.delete()

    # Redirigir a la carpeta donde estaba el archivo
    if carpeta:
        return redirect(f"{reverse('lista_archivos')}?{urlencode({'carpeta': carpeta.id})}")
    else:
        return redirect('lista_archivos')


def login(request):

    if request.user.is_authenticated:
        return redirect('lista_archivos')

    if request.method == 'POST':
        email = request.POST.get('email')
        email = email.lower()
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)

        if user is not None:

            # Verificar si el usuario tiene permiso de acceso
            tiene_acceso = acceso_pagina.objects.filter(usuario=user, acceso=True).exists()
            if tiene_acceso:
                auth_login(request, user)
                return redirect('lista_archivos')
            else:
                messages.error(request, 'No tiene permiso para acceder a esta página')
        else:
            messages.error(request, 'Usuario o contraseña incorrectos')

    return render(request, 'login_nube.html')


def logout(request):
    auth_logout(request)
    return redirect('login')

@login_required
def eliminar_carpeta(request, carpeta_id):
    carpeta = get_object_or_404(Carpeta, id=carpeta_id)

    if request.user != carpeta.usuario and not request.user.is_staff:
        return redirect('lista_archivos')

    carpeta_padre = carpeta.carpeta_padre  # lo guardamos antes de eliminar

    def eliminar_contenido_recursivo(carpeta):
        for archivo in carpeta.archivos.all():
            if archivo.archivo:
                archivo.archivo.delete(save=False)
            archivo.delete()

        for sub in carpeta.subcarpetas.all():
            eliminar_contenido_recursivo(sub)

        carpeta.delete()

    eliminar_contenido_recursivo(carpeta)

    if carpeta_padre:
        # Redirige a la carpeta padre
        url = reverse('lista_archivos') + '?' + urlencode({'carpeta': carpeta_padre.id})
        return redirect(url)
    else:
        # Redirige al directorio raíz
        return redirect('lista_archivos')