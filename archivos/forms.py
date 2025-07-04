# forms.py
from django import forms
from .models import Archivo, Carpeta, PermisoCarpeta

class ArchivoForm(forms.ModelForm):
    class Meta:
        model = Archivo
        fields = ['nombre', 'archivo', 'carpeta']  # Agregamos carpeta

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user')
        super().__init__(*args, **kwargs)
        # Mostrar solo carpetas donde el usuario tenga permiso de escritura
        carpetas = PermisoCarpeta.objects.filter(usuario=user, permiso__in=['escritura', 'propietario']).values_list('carpeta_id', flat=True)
        self.fields['carpeta'].queryset = Carpeta.objects.filter(id__in=carpetas)
