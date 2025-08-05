from django.db import models
import os 

class Departamento(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre

class Formulario(models.Model):
    nombre = models.CharField(
        max_length=100,
        unique=False,
        error_messages={
            'unique': 'Ya existe un formulario con este Nombre. Por favor, elige otro.',
        }
    )
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, blank=True, null=True, help_text="Departamento al que pertenece el formulario")
    descripcion = models.TextField(blank=True, null=True)
    titulo = models.CharField(max_length=100, null=True)
    subtitulo = models.TextField(blank=True, null=True)
    imagen = models.ImageField(upload_to='formularios_imagenes/', null=True, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    texto_boton_enviar = models.CharField(max_length=50, default="Enviar")
    
    # Estilos para el título del formulario
    titulo_bold = models.BooleanField(default=False)
    titulo_italic = models.BooleanField(default=False)
    titulo_underline = models.BooleanField(default=False)
    titulo_color = models.CharField(max_length=7, default='#000000')
    titulo_font = models.CharField(max_length=100, default="'Inter',sans-serif")
    titulo_align = models.CharField(max_length=10, default='center')
    
    # Estilos para el subtítulo del formulario
    subtitulo_bold = models.BooleanField(default=False)
    subtitulo_italic = models.BooleanField(default=False)
    subtitulo_underline = models.BooleanField(default=False)
    subtitulo_color = models.CharField(max_length=7, default='#000000')
    subtitulo_font = models.CharField(max_length=100, default="'Inter',sans-serif")
    subtitulo_align = models.CharField(max_length=10, default='center')
    subtitulo_fontSize = models.CharField(max_length=10, default='16px')

    # Color de tema de fondo para el formulario
    tema_color = models.CharField(max_length=7, default='#e8e8e8')  # Hex color, por defecto igual al fondo actual

    # Permitir volver a contestar la encuesta tras éxito
    permitir_volver_a_contestar = models.BooleanField(default=False, help_text="Permitir que el usuario vuelva a contestar tras enviar.")

    class Meta:
        ordering = ['-fecha_creacion']

    def __str__(self):
        return self.titulo

    def save(self, *args, **kwargs):
        # Eliminar sincronización automática entre nombre/descripcion y titulo/subtitulo
        super().save(*args, **kwargs)

class Punto(models.Model):
    latitud = models.FloatField()
    longitud = models.FloatField()
    
    def __str__(self):
        return f"({self.latitud}, {self.longitud})"
    
def content_file_name_adjunto(instance, filename):
    ext = filename.split('.')[-1]
    filename = "%s.%s" % ('adjunto', ext)
    folder = "assets/imagen_sig/" + str(instance.id)# Puedes ajustar la carpeta según tus necesidades
    return os.path.join(folder, filename)

class Pregunta(models.Model):
    TEXTO_CHOICES = (
        ('texto', 'Texto'),
        ('verdadero_falso', 'Verdadero/Falso'),
        ('opcion_multiple', 'Opción Múltiple'),
        ('foto', 'Foto'),
        ('valoracion', 'Valoración'),
        ('mapa', 'Mapa'),  # <-- Nuevo tipo de pregunta
        ('fecha', 'Fecha'),  # <-- NUEVO tipo de pregunta
    )
    texto = models.TextField()
    descripcion = models.CharField(max_length=255, blank=True, null=True, help_text="Subtítulo o aclaración de la pregunta")
    placeholder = models.CharField(max_length=255, blank=True, null=True, help_text="Sugerencia para el input (solo tipo texto)")
    tipo = models.CharField(max_length=20, choices=TEXTO_CHOICES, default='texto')
    foto = models.ImageField(upload_to='preguntas_fotos/', null=True, blank=True)
    mostrar_como_radio = models.BooleanField(default=False)
    permitir_multiple = models.BooleanField(default=False)
    rango_minimo = models.IntegerField(default=1)
    rango_maximo = models.IntegerField(default=5)
    formulario = models.ForeignKey(Formulario, on_delete=models.CASCADE, related_name='preguntas')
    obligatorio = models.BooleanField(default=False)
    fecha_tipo = models.CharField(max_length=10, choices=(('envio','Fecha de envío'),('usuario','Fecha elegida')), default='envio')
    orden = models.PositiveIntegerField(default=0)  # <--- Campo de orden
    # Tipo de geometría para preguntas tipo mapa: 'punto', 'linea', 'poligono'
    mapa_tipo = models.CharField(
        max_length=10,
        choices=(('punto', 'Punto'), ('linea', 'Línea'), ('poligono', 'Polígono')),
        default='punto',
        help_text="Tipo de selección de área en preguntas tipo mapa"
    )
    pregunta_dependiente = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='preguntas_dependientes')

    class Meta:
        ordering = ['orden', 'id']

    @classmethod
    def crear_pregunta_predefinida(cls, tipo, formulario):
        pregunta = cls(
            tipo=tipo,
            formulario=formulario
        )
        # Establecer valores predeterminados según el tipo
        if tipo == 'texto':
            pregunta.texto = "Escribe tu respuesta aquí"
            pregunta.placeholder = "Escribe tu respuesta aquí"
        elif tipo == 'verdadero_falso':
            pregunta.texto = "Selecciona Verdadero o Falso"
            pregunta.mostrar_como_radio = True
        elif tipo == 'opcion_multiple':
            pregunta.texto = "Selecciona una opción"
            pregunta.mostrar_como_radio = True
        elif tipo == 'foto':
            pregunta.texto = "Sube una foto"
        elif tipo == 'valoracion':
            pregunta.texto = "Selecciona una valoración"
            pregunta.rango_minimo = 1
            pregunta.rango_maximo = 5
        elif tipo == 'fecha':
            pregunta.texto = "Selecciona una fecha"
            pregunta.descripcion = "Elige una fecha o usa la fecha de envío"
            pregunta.save()
            pregunta.fecha_tipo = 'envio'  # Por defecto
        pregunta.save()
        # Si es opción múltiple, crear opciones predeterminadas
        if tipo == 'opcion_multiple':
            opciones = ["Opción 1", "Opción 2", "Opción 3"]
            for texto in opciones:
                Opcion.objects.create(pregunta=pregunta, texto=texto)
        return pregunta

    def __str__(self):
        return self.texto



class Opcion(models.Model):
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE)
    texto = models.CharField(max_length=200)

    def __str__(self):
        return self.texto
    
class ImagenRespuesta(models.Model):
    punto = models.ForeignKey(Punto, on_delete=models.CASCADE, null=True, blank=True)
    imagen = models.ImageField(upload_to='imagenes_respuestas/')

    def __str__(self):
        return self.imagen.url

class Respuesta(models.Model):
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE)
    punto = models.ForeignKey(Punto, on_delete=models.CASCADE)
    respuesta = models.TextField()
    imagen_respuesta = models.ForeignKey(ImagenRespuesta, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.pregunta.texto}: {self.respuesta} (Punto: {self.punto})"

class NuevoFormulario(models.Model):
    imagen = models.ImageField(upload_to='imagenes_formulario/') # Asegúrate de que la carpeta exista
    # Puedes agregar otros campos si es necesario

class Usuario(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.nombre

class Geometria(models.Model):
    TIPO_CHOICES = (
        ('punto', 'Punto'),
        ('linea', 'Línea'),
        ('poligono', 'Polígono'),
    )
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    coordenadas = models.TextField(help_text="Coordenadas en formato JSON: punto=[lat,lng], linea/poligono=[[lat,lng],...]")
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE, related_name='geometrias')
    punto = models.ForeignKey(Punto, on_delete=models.CASCADE, null=True, blank=True)
    # Puedes agregar relación con Respuesta si lo necesitas

    def __str__(self):
        return f"{self.tipo}: {self.coordenadas[:30]}..."

class FormularioRespondidoIP(models.Model):
    formulario = models.ForeignKey(Formulario, on_delete=models.CASCADE)
    ip = models.GenericIPAddressField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.formulario.titulo} - {self.ip}"
    

class FormularioTexto(models.Model):
    formulario = models.ForeignKey(Formulario, on_delete=models.CASCADE, related_name='formularios_texto')
    texto = models.TextField(blank=True, null=True, help_text="Texto del formulario")
    descripcion = models.TextField(blank=True, null=True, help_text="Descripción del formulario")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

        # Estilos para el título del formulario
    texto_bold = models.BooleanField(default=False)
    texto_italic = models.BooleanField(default=False)
    texto_underline = models.BooleanField(default=False)
    texto_color = models.CharField(max_length=7, default='#000000')
    texto_font = models.CharField(max_length=100, default="'Inter',sans-serif")
    texto_align = models.CharField(max_length=10, default='center')
    
    # Estilos para el subtítulo del formulario
    descripcion_bold = models.BooleanField(default=False)
    descripcion_italic = models.BooleanField(default=False)
    descripcion_underline = models.BooleanField(default=False)
    descripcion_color = models.CharField(max_length=7, default='#000000')
    descripcion_font = models.CharField(max_length=100, default="'Inter',sans-serif")
    descripcion_align = models.CharField(max_length=10, default='center')
    descripcion_fontSize = models.CharField(max_length=10, default='16px')

    def __str__(self):
        return f"Formulario Texto: {self.formulario.titulo} - {self.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S')}"
    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = "Formulario Texto"
        verbose_name_plural = "Formularios Texto"
        