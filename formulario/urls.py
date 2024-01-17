from django.urls import path
from . import views

app_name = 'solicitud'

urlpatterns = [
    path('',views.crear_protocolo),
    path('vista_previa/<int:id>', views.vista_previa, name="vista_previa"),
]