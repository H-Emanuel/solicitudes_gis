from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name="login"),
    path('logout/', views.logout, name="logout"),

    path('', views.lista_archivos, name='lista_archivos'),
    path('subir/', views.subir_archivo, name='subir_archivo'),
    path('eliminar/<int:archivo_id>/', views.eliminar_archivo, name='eliminar_archivo'),
]
