from django.shortcuts import render, redirect, get_object_or_404
from .models import Archivo
from .forms import ArchivoForm
import os
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate,update_session_auth_hash, login as auth_login, logout as auth_logout
from django.contrib import messages
from .models import acceso_pagina


@login_required(login_url='/nube/login/')

@login_required
def lista_archivos(request):
    archivos = Archivo.objects.all().order_by('-fecha_subida')

    # Añadir URL absoluta a cada archivo
    for archivo in archivos:
        archivo.url_absoluto = request.build_absolute_uri(archivo.archivo.url)

    return render(request, 'lista.html', {'archivos': archivos})


@login_required
def subir_archivo(request):
    if request.method == 'POST':
        form = ArchivoForm(request.POST, request.FILES)
        if form.is_valid():
            archivo = form.save(commit=False)
            archivo.usuario = request.user
            archivo.save()
            return redirect('lista_archivos')
    else:
        form = ArchivoForm()
    return render(request, 'subir.html', {'form': form})

@login_required
def eliminar_archivo(request, archivo_id):
    archivo = get_object_or_404(Archivo, pk=archivo_id, usuario=request.user)
    archivo.archivo.delete()
    archivo.delete()
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
    return redirect('/nube/login')