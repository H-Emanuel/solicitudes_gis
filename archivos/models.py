from django.db import models
from django.contrib.auth.models import User
import os

class Archivo(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='archivos/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    

    def __str__(self):
        return self.nombre
    
    @property
    def extension(self):
        name, extension = os.path.splitext(self.archivo.name)
        return extension.lower().replace('.', '')


class acceso_pagina(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    acceso = models.BooleanField(default=False)  # True si la página es de acceso público, False si es privada
    
    class Meta:
        verbose_name_plural = "Accesos a páginas"
