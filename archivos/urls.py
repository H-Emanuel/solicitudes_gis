from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login, name="login"),
    path('logout/', views.logout, name="logout"),

    path('', views.lista_archivos, name='lista_archivos'),
    path('subir/', views.subir_archivo_o_carpeta, name='subir_archivo'),
    path('eliminar/<int:archivo_id>/', views.eliminar_archivo, name='eliminar_archivo'),
    path('eliminar_caperta/<int:carpeta_id>/', views.eliminar_carpeta, name='eliminar_carpeta'),

]
