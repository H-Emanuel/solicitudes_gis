from django.db import models
from django.contrib.auth.models import User
import os


class Carpeta(models.Model):
    privada = models.BooleanField(default=False,)
    nombre = models.CharField(max_length=255)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    carpeta_padre = models.ForeignKey('self', null=True, blank=True, related_name='subcarpetas', on_delete=models.CASCADE)

    def __str__(self):
        return self.nombre


def ruta_archivo_completa(instance, filename):
    # filename: archivos importantes/documentos de plano/archivo.pdf
    return filename  # se guarda la estructura completa


class Archivo(models.Model):
    nombre = models.CharField(max_length=255)
    archivo = models.FileField(upload_to=ruta_archivo_completa)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    carpeta = models.ForeignKey(Carpeta, null=True, blank=True, on_delete=models.CASCADE, related_name='archivos')
    fecha_subida = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return self.nombre

    @property
    def extension(self):
        name, extension = os.path.splitext(self.archivo.name)
        return extension.lower().replace('.', '')


class PermisoCarpeta(models.Model):
    carpeta = models.ForeignKey(Carpeta, on_delete=models.CASCADE)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # 'lectura', 'escritura', etc.
    permiso = models.CharField(max_length=50, choices=[
        ('lectura', 'Solo lectura'),
        ('escritura', 'Lectura y escritura'),
        ('propietario', 'Propietario'),
    ])

    class Meta:
        unique_together = ('carpeta', 'usuario')

class acceso_pagina(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    acceso = models.BooleanField(default=False)  # True si la página es de acceso público, False si es privada
    
    class Meta:
        verbose_name_plural = "Accesos a páginas"