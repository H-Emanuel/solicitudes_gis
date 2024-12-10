from django.urls import path
from . import views
from django.contrib.auth.views import PasswordChangeView


urlpatterns = [
    path('download-excel/', views.download_excel, name='download_excel'),
    path('Historial_Visitas/', views.Historial_Visitas, name="Historial_Visitas"),
    path('solicitude_llegadas/', views.solicitude_llegadas, name="solicitude_llegadas"),
    path('Gestion_imagen/', views.Gestion_imagen, name="Gestion_imagen"),
    path('control/', views.control, name="control"),
    path('actualizar_estado/', views.actualizar_estado, name='actualizar_estado'),
    path('actualizar_profesional/', views.actualizar_profesional, name='actualizar_profesional'),
    path('actualizar_limite/', views.actualizar_limite, name='actualizar_limite'),

    path('eliminar_imagen/<int:imagen_id>/', views.eliminar_imagen, name='eliminar_imagen'),
    path('Gestion_pdf/', views.Gestion_pdf, name="Gestion_pdf"),


    path('cambiar_contraseña/', views.cambiar_contraseña, name="cambiar_contraseña"),
    path('logout/', views.logout, name="logout"),
    path('login/', views.login, name="core_login"),

    path('correos/', views.Envio_de_correo, name="Envio_de_correo"),

    path('vista_previa_reaccinacion/<int:id>', views.vista_previa_reaccinacion, name="vista_previa_reaccinacion"),

    path('resert_limite/', views.resert_limite, name="resert_limite"),

    
    path('admin_re/', views.delegar_admin, name="delegar_admin"),

]