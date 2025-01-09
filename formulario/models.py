from django.db import models
from django.contrib.auth.models import User
import os

ESTADO ={
    ('RECIBIDO','RECIBIDO'),
    ('EN PROCESO','EN PROCESO'),
    ('EJECUTADO','EJECUTADO'),
    ('RECHAZADO','RECHAZADO')
}

PROFESIONAL ={
    ('No Asignado','No Asignado'),
    ('Nicolas Rebolledo','Nicolas Rebolledo'),
    ('Andres Mardones','Andres Mardones'),
    ('Osvaldo Moya','Osvaldo Moya'),
    ('Francis Cadiz','Francis Cadiz'),
    ('Ivan Cantero','Ivan Cantero'),
    ('Deisy Pereira ','Deisy Pereira '),
    ('Jaime Alvarado','Jaime Alvarado'),
    ('Emanuel Venegas','Emanuel Venegas')
}

LIMITE_DE_DIA ={
    ('',''),
    ('L','LIVIANA 4 Dias máximos'),
    ('M','MEDIA 8 Dias máximos'),
    ('A','ALTO 15 Dias máximos'),
    ('P','Plazo X Asignar los Dias máximos'),
}

DIRECCION ={
    ('',''),
    ('Gabinete','Gabinete'),
    ('Administración Municipal','Administración Municipal'),
    ('Dirección de Desarrollo Comunitario','Dirección de Desarrollo Comunitario'),
    ('Dirección de Obras Municipales','Dirección de Obras Municipales'),
    ('Dirección de Tránsito y Transporte públicos','Dirección de Tránsito y Transporte públicos'),
    ('Dirección de Administración y Finanzas','Dirección de Administración y Finanzas'),
    ('Dirección desarrollo Económico y Cooperación Internacional','Dirección desarrollo Económico y Cooperación Internacional'),
    ('Dirección de Operaciones','Dirección de Operaciones'),
    ('Dirección de Desarrollo Cultural','Dirección de Desarrollo Cultural'),
    ('Dirección de Seguridad Ciudadana','Dirección de Seguridad Ciudadana'),
    ('Dirección de Vivienda, Barrio y Territorio','Dirección de Vivienda, Barrio y Territorio'),
    ('Dirección de Medioambiente','Dirección de Medioambiente'),
    ('SECPLA','SECPLA'),
    ('Dirección de Género, Mujeres y Diversidades','Dirección de Género, Mujeres y Diversidades'),
    ('Otros','Otros'),
    }

# Create your models here.
def content_file_name_adjunto(instance, filename):
    ext = filename.split('.')[-1]
    filename = "%s.%s" % ('adjunto', ext)
    folder = "assets/document/" + str("archivo")# Puedes ajustar la carpeta según tus necesidades
    return os.path.join(folder, filename)


class ProtocoloSolicitud(models.Model):
    id = models.BigAutoField(primary_key=True, unique=True)
    departamento = models.CharField(max_length=100, blank=True, default='')
    direccion = models.CharField(max_length=100, blank=True, default='',choices=DIRECCION)
    nombre_solicitante = models.CharField(max_length=255, blank=True, default='')
    nombre_proyecto = models.CharField(max_length=255, blank=True, default='')
    corre_solicitante = models.CharField(max_length=255, blank=True, default='')
    area = models.CharField(max_length=50, blank=True, default='')
    objetivos = models.TextField()
    insumo = models.CharField(max_length=255, blank=True, default='')
    producto = models.CharField(max_length=255, blank=True, default='')
    cambios_posible = models.CharField(max_length=255, blank=True, default='')
    fecha = models.DateTimeField(auto_now_add=True)
    codigo = models.CharField(max_length=10, blank=True, default='')

    orden_trabajo = models.BigIntegerField(null=True, blank= True)

    fecha_D = models.DateTimeField(null=True, blank=True)

    fecha_T = models.DateTimeField(null=True, blank=True)

    fecha_L = models.DateTimeField(null=True, blank=True)

    profesional = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True )

    tipo_limite = models.CharField(max_length=100, blank=True, default='',choices=LIMITE_DE_DIA)

    estado = models.CharField(max_length=100, blank=True, default='RECIBIDO',choices=ESTADO)

    archivo_adjunto = models.FileField(upload_to=content_file_name_adjunto, blank=True, null=True)

    enviado_correo = models.BooleanField(default=False)

    enviado_correo_t = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "protocolo_solicitud"
        verbose_name_plural = "protocol_solicitudes"

    def __str__(self):
        return str(self.id) + ' - ' + self.departamento 
    
class ArchivoProtocolo(models.Model):
    protocolo = models.ForeignKey(ProtocoloSolicitud, on_delete=models.CASCADE, related_name='archivos')
    archivo = models.FileField(upload_to=content_file_name_adjunto)

    class Meta:
        verbose_name = "archivo_protocolo"
        verbose_name_plural = "archivos_protocolo"

    def __str__(self):
        return str(self.protocolo.id) + ' - ' + str(self.id)
    

def content_file_link_adjunto(instance, filename):
    # Extraer la extensión del archivo original
    ext = filename.split('.')[-1]
    
    # Carpeta específica basada en el ID del objeto
    folder = f"assets/document/correo/{instance.protocolo.id}/"
    
    # Base name del archivo
    base_filename = "adjunto"
    
    # Ruta completa del archivo inicial
    file_path = os.path.join(folder, f"{base_filename}.{ext}")

    # Verificar si ya existe un archivo con el mismo nombre
    counter = 1
    while os.path.exists(os.path.join(folder, file_path)):
        # Crear una versión con un sufijo incremental
        file_path = os.path.join(folder, f"{base_filename}_{counter}.{ext}")
        counter += 1

    return file_path


class Archivo_Link(models.Model):
    protocolo = models.ForeignKey(ProtocoloSolicitud, on_delete=models.CASCADE, related_name='archivos_link')
    archivo = models.FileField(upload_to=content_file_link_adjunto)

    class Meta:
        verbose_name = "archivo_protocolo"
        verbose_name_plural = "archivos_protocolo"

    def __str__(self):
        return str(self.protocolo.id) + ' - ' + str(self.id)
    
class Registro_designio(models.Model):
    id = models.BigAutoField(primary_key=True, unique=True)

    protocolo = models.ForeignKey(ProtocoloSolicitud, on_delete=models.CASCADE, related_name='protocolo')
    profesional = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True )
    objetivos = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Registro_designio"
        verbose_name_plural = "Registros_designios"

    def __str__(self):
        return str(self.profesional.first_name) + ' - ' + str(self.protocolo.id)