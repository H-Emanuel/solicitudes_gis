from django.urls import include, path
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.views import LogoutView
from hashids import Hashids

hashids = Hashids(salt='cambia_esto_por_un_salt_secreto', min_length=8)

urlpatterns = [
    path('', views.administrar_formularios, name='survey'),

    path('', views.administrar_formularios, name='administrar_formularios'),
    path('ver_guardado/<str:formulario_hashid>/', views.ver_guardado, name='ver_guardado'),
    path('guardar_punto/<str:formulario_hashid>/', views.guardar_punto, name='guardar_punto'), 
    path('cargar_imagen/', views.cargar_imagen, name='cargar_imagen'),
    path('agregar_pregunta/<str:formulario_hashid>/', views.agregar_pregunta, name='agregar_pregunta'),
    path('actualizar_preguntas/', views.actualizar_preguntas, name='actualizar_preguntas'),
    path('eliminar_pregunta/<int:pregunta_id>/', views.eliminar_pregunta, name='eliminar_pregunta'),
    path('obtener_pregunta/<int:pregunta_id>/', views.obtener_pregunta, name='obtener_pregunta'),
    path('editar_pregunta/<int:pregunta_id>/', views.editar_pregunta, name='editar_pregunta'),
    path('administrar_formularios/', views.administrar_formularios, name='administrar_formularios'),
    path('eliminar_formulario/<int:formulario_id>/', views.eliminar_formulario, name='eliminar_formulario'),
    path('eliminar_punto/<int:punto_id>/', views.eliminar_punto, name='eliminar_punto'),
    path('eliminar_imagen_formulario/<str:formulario_hashid>/', views.eliminar_imagen_formulario, name='eliminar_imagen_formulario'),
    path('guardar_cambios_formulario/', views.guardar_cambios_formulario, name='guardar_cambios_formulario'),
    path('descargar_excel/<str:formulario_hashid>/', views.descargar_excel, name='descargar_excel'),
    path('descargar_kmz/<str:formulario_hashid>/', views.descargar_kmz, name='descargar_kmz'),
    path('obtener_datos_formulario/<str:formulario_hashid>/', views.obtener_datos_formulario, name='obtener_datos_formulario'),
    path('actualizar_portada_formulario/<str:formulario_hashid>/', views.actualizar_portada_formulario, name='actualizar_portada_formulario'),
    path('actualizar_orden_preguntas/', views.actualizar_orden_preguntas, name='actualizar_orden_preguntas'),
    path('exito_guardado/<str:formulario_hashid>/', views.exito_guardado, name='exito_guardado'),
    path('actualizar_nombre_formulario/<str:formulario_hashid>/', views.actualizar_nombre_formulario, name='actualizar_nombre_formulario'),
    
    path('logout/', include(('archivos.urls', 'home'), namespace='logout')),
    path('login/', include(('archivos.urls', 'home'), namespace='login')),

    path('actualizar_punto/<int:punto_id>/', views.actualizar_punto, name='actualizar_punto'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)