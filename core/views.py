from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.shortcuts import redirect
from .models import *
from formulario.views import *
from urllib.parse import unquote
from arcgis.gis import GIS
from arcgis.features import FeatureLayer
from datetime import datetime


def inicio(request):
    return render(request,'core/iniciar.html')
def menu(request):
    current_page = 'home'
    activities = UserActivity.objects.all()
    solicitud = ProtocoloSolicitud.objects.all()
    data = {
    'usuarios': activities,
    'current_page': current_page,
    'solicitud': solicitud,
    }
    return render(request, 'core/home.html',data)
def arcgisregister(request):
    # Obtener el valor de la cookie 'departamento'
    departamento_seleccionado = request.COOKIES.get('departamento')

    if departamento_seleccionado:


        user_activity = UserActivity(page='experience.arcgis.com', departamento=departamento_seleccionado)
        user_activity.save()
        Registro_arcgis(departamento_seleccionado,'experience.arcgis.com')  

    # Redirigir al usuario al enlace de ArcGIS
    return redirect('https://experience.arcgis.com/experience/6a6b0cbfb2094d10ba11b439c8060a8d/?return_url=/some_view/')

def geoportalVisita(request):

    departamento_seleccionado = request.COOKIES.get('departamento')

    if departamento_seleccionado:

        user_activity = UserActivity(page='Geoportal-sig-munivalpo.hub.arcgis.com', departamento=departamento_seleccionado)
        user_activity.save()   
        Registro_arcgis(departamento_seleccionado,'Gestion SIG')  

    return redirect('https://geoportal-sig-munivalpo.hub.arcgis.com/')

def gestionsig(request):
    departamento_seleccionado = request.COOKIES.get('departamento')


    if departamento_seleccionado:
        user_activity = UserActivity(page='Gestion SIG', departamento=departamento_seleccionado)
        user_activity.save()   
        Registro_arcgis(departamento_seleccionado,'Gestion SIG')  

    return redirect('https://www.arcgis.com/apps/dashboards/b35864f66368465fa11b6c40b1321688')

def SSregistro(request):
    departamento_seleccionado = request.COOKIES.get('departamento')

    if departamento_seleccionado:






        user_activity = UserActivity(page='Pagina Solicitudes', departamento=departamento_seleccionado)
        user_activity.save()
        Registro_arcgis(departamento_seleccionado,'Pagina Solicitudes')  
    return redirect('/solicitud/')


def buscar_protocolo(request):
    if request.method == "POST":
        codigo = request.POST.get("codigo")
        correo_input = request.POST.get("correo_input")  # Podría ser None

        try:
            protocolo = ProtocoloSolicitud.objects.get(codigo=codigo)
            correo_registrado = protocolo.corre_solicitante

            data = {
                "estado": protocolo.estado,
                "correo": correo_registrado,
                "error": False
            }

            # Si se ingresó correo, validar
            if correo_input:
                if correo_input.strip().lower() == correo_registrado.strip().lower():
                    # Coincide: enviar respuesta y archivos
                    respuesta = Respuesta_protocolo.objects.filter(protocolo=protocolo).first()
                    if respuesta:
                        data["respuesta"] = respuesta.respuesta
                        archivos = Archivo_respuesta.objects.filter(respuesta=respuesta)
                        data["archivos"] = [
                            {
                                "url": archivo.archivo.url,
                                "nombre": archivo.archivo.name.split("/")[-1]
                            } for archivo in archivos
                        ]
                    else:
                        data["respuesta"] = None
                        data["archivos"] = []
                else:
                    return JsonResponse({"error": True, "message": "El correo ingresado no coincide con el registrado."})
            # Si no hay correo_input, solo devuelve estado y correo
            return JsonResponse(data)

        except ProtocoloSolicitud.DoesNotExist:
            return JsonResponse({"error": True, "message": "Protocolo no encontrado."})

    return JsonResponse({"error": True, "message": "Método no permitido."})



def Registro_arcgis(depa, pagina):
    try:
        # Obtener la fecha y hora actual
        now = datetime.now()

        # Diccionario para los meses con el formato personalizado
        meses = {
            1: "1-ENERO",
            2: "2-FEBRERO",
            3: "3-MARZO",
            4: "4-ABRIL",
            5: "5-MAYO",
            6: "6-JUNIO",
            7: "7-JULIO",
            8: "8-AGOSTO",
            9: "9.1-SEPTIEMBRE",
            10: "9.2-OCTUBRE",
            11: "9.3-NOVIEMBRE",
            12: "9.4-DICIEMBRE"
        }

        # Obtener el año en número
        año = now.year

        # Obtener el mes en número
        mes_numero = now.month

        # Obtener el mes en formato personalizado
        mes_formato = meses.get(mes_numero, "Mes no válido")
        formatted_time = now.strftime("%m-%d-%Y-%H:%M")
        sigla = obtener_sigla(depa)

        # Conectar a ArcGIS
        gis = GIS("https://www.arcgis.com", "emanuel.venegas_munivalpo", "Godzilla_2016")

        # URL de la capa
        layer_url = "https://services8.arcgis.com/5BaAHTQ4nRVz57H5/arcgis/rest/services/Registro_de_Usuarios/FeatureServer/0"
        feature_layer = FeatureLayer(layer_url)

        # Obtener la última Id en la capa
        query_result = feature_layer.query(where="1=1", order_by_fields="Id DESC", out_fields="Id", return_geometry=False)
        last_Id = query_result.features[0].attributes['Id'] if query_result.features else 0

        # Calcular la nueva Id
        new_Id = last_Id + 1

        # Definir los atributos de los nuevos datos
        new_feature = {
            "attributes": {
                "Id": new_Id,           
                "Departemen": depa,            
                "Fecha": formatted_time, 
                "MES": mes_formato, 
                "Pagina": pagina,           
                "Direc_Dept": depa,            
                "Sigla": sigla, 
                "AÑO": año,           
            }
        }

        # Crear una lista con la nueva característica
        features_to_add = [new_feature]

        # Agregar las nuevas características a la capa
        response = feature_layer.edit_features(adds=features_to_add)
        
        # Verificar si la respuesta fue exitosa
        if 'addResults' in response and response['addResults'][0]['success']:
            return True
        else:
            return False

    except Exception as e:
        print(f"Ocurrió un error: {e}")
        return False

def obtener_sigla(departamento):

    departamentos = {
    "ALCALDÍA": "ALCALDIA",
    "Dirección de Administración y Finanzas": "DAF",
    "Dirección de Asesoría Jurídica": "DAJ",
    "Dirección desarrollo Económico y Cooperación Internacional": "DES_ECONOMICO",
    "Dirección de Desarrollo Comunitario": "DIDECO",
    "Dirección de Género, Mujeres y Diversidades": "GENERO",
    "Dirección de Medioambiente": "MEDIO AMBIENTE",
    "Dirección de Obras Municipales": "OBRAS MUNICIPALES",
    "Dirección de Operaciones": "OPERACIONES",
    "sin direccion": "Periodo Marcha Blanca",
    "SECPLA": "SECPLA",
    "SIG": "SECPLA",
    "Dirección de Seguridad Ciudadana": "SEGURIDAD",
    "Dirección de Tránsito y Transporte público": "TRANSITO",
    "Dirección de Vivienda, Barrio y Territorio": "VIVIENDA"
    }

    return departamentos.get(departamento, "Departamento no encontrado")

