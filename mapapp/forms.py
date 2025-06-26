from django import forms
from .models import Pregunta, Opcion
from .models import NuevoFormulario, Formulario
from .models import Departamento

class PreguntaForm(forms.ModelForm):
    TEXTO_CHOICES = (
        ('texto', 'Texto'),
        ('verdadero_falso', 'Verdadero/Falso'),
        ('opcion_multiple', 'Opción Múltiple'),
        ('foto', 'Foto'),
        ('valoracion', 'Valoración'),  # Nuevo tipo de pregunta
        
        
    )
    tipo = forms.ChoiceField(choices=TEXTO_CHOICES, label='Tipo de Pregunta')
    opciones = forms.CharField(widget=forms.Textarea, required=False, label='Opciones (una por línea)')
    foto = forms.ImageField(required=False, label='Foto')
    mostrar_como_radio = forms.BooleanField(required=False, label='Mostrar como botones de radio')
    rango_minimo = forms.IntegerField(label='Rango mínimo', initial=1, required=False)  # Nuevo campo
    rango_maximo = forms.IntegerField(label='Rango máximo', initial=7, required=False)  # Nuevo campo
    
    class Meta:
        model = Pregunta
        fields = ['texto', 'descripcion', 'placeholder', 'tipo', 'foto', 'mostrar_como_radio', 'rango_minimo', 'rango_maximo']  # No incluir 'portada'

    def save(self, commit=True):
        pregunta = super().save(commit=False)
        
        # First save the pregunta object to the database
        pregunta.save()
        
        # Now that pregunta is saved, we can create options
        if pregunta.tipo == 'opcion_multiple':
            # Get the options text from the cleaned data
            opciones_texto = self.cleaned_data.get('opciones', '')
            
            # Clear existing options for this question
            Opcion.objects.filter(pregunta=pregunta).delete()
            
            # Split the options text by newlines
            if opciones_texto:
                # First try splitting by newlines
                opciones = [op.strip() for op in opciones_texto.splitlines() if op.strip()]
                
                # If that doesn't work, try splitting by comma
                if len(opciones) <= 1 and ',' in opciones_texto:
                    opciones = [op.strip() for op in opciones_texto.split(',') if op.strip()]
                
                # Create the options
                for opcion_texto in opciones:
                    if opcion_texto:  # Only create if there's text
                        Opcion.objects.create(pregunta=pregunta, texto=opcion_texto)
        
        return pregunta
    
class NuevoFormularioForm(forms.ModelForm):
    class Meta:
        model = NuevoFormulario
        fields = ['imagen']

class FormularioForm(forms.ModelForm):
    class Meta:
        model = Formulario
        fields = ['nombre', 'departamento', 'descripcion']
        widgets = {
            'nombre': forms.TextInput(attrs={'autocomplete': 'off'}),
            'descripcion': forms.Textarea(attrs={'autocomplete': 'off'}),
        }

class FormularioAparienciaForm(forms.ModelForm):
    class Meta:
        model = Formulario
        fields = ['tema_color']
        widgets = {
            'tema_color': forms.TextInput(attrs={'type': 'color'})
        }