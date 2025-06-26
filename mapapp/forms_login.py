from django import forms
from .models import Usuario

class LoginForm(forms.Form):
    nombre = forms.CharField(label='Usuario', max_length=100, widget=forms.TextInput(attrs={'class': 'text-input', 'placeholder': 'Nombre de usuario'}))
    password = forms.CharField(label='Contraseña', max_length=128, widget=forms.PasswordInput(attrs={'class': 'text-input', 'placeholder': 'Contraseña'}))
