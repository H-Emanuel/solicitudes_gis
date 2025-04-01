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
from django.shortcuts import render
import locale

from django.shortcuts import render
from django.db import connection
import matplotlib.pyplot as plt
import io
import base64
visitas_departamentosig = 0  # Contador global de visitas

def inicio(request):
    return render(request,'core/iniciar.html')

def menu(request):
    # Registrar la visita
    ip_address = request.META.get('REMOTE_ADDR')
    if ip_address:
       
            Visita.objects.create(ip_address=ip_address)

    current_page = 'home'
    activities = UserActivity.objects.all()
    solicitud = ProtocoloSolicitud.objects.all()
    data = {
        'usuarios': activities,
        'current_page': current_page,
        'solicitud': solicitud,
    }
    return render(request, 'core/home.html', data)

def arcgisregister(request):
    departamento_seleccionado = request.COOKIES.get('departamento')
    if departamento_seleccionado:
        DepartamentoSeleccionado.objects.create(nombre_departamento=departamento_seleccionado)

    
    return redirect('https://experience.arcgis.com/experience/6a6b0cbfb2094d10ba11b439c8060a8d/?return_url=/some_view/')

def geoportalVisita(request):
    departamento_seleccionado = request.COOKIES.get('departamento')
    if departamento_seleccionado:
        DepartamentoSeleccionado.objects.create(nombre_departamento=departamento_seleccionado)

    return redirect('https://geoportal-sig-munivalpo.hub.arcgis.com/')

def gestionsig(request):
    departamento_seleccionado = request.COOKIES.get('departamento')
    if departamento_seleccionado:
        DepartamentoSeleccionado.objects.create(nombre_departamento=departamento_seleccionado)

    return redirect('https://www.arcgis.com/apps/dashboards/b35864f66368465fa11b6c40b1321688')

def SSregistro(request):
    departamento_seleccionado = request.COOKIES.get('departamento')
    if departamento_seleccionado:
        DepartamentoSeleccionado.objects.create(nombre_departamento=departamento_seleccionado)
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


def contar_visita_departamentosig(request):
    global visitas_departamentosig
    visitas_departamentosig += 1
    return JsonResponse({'visitas': visitas_departamentosig})

def obtener_visitas_departamentosig(request):
    return JsonResponse({'visitas': visitas_departamentosig})


def estadisticas(request):
    # Obtener datos de la base de datos
    with connection.cursor() as cursor:
        cursor.execute("SELECT insumo_id, COUNT(*) FROM formulario_protocolosolicitudinsumo GROUP BY insumo_id")
        resultados = cursor.fetchall()

    insumos = [fila[0] for fila in resultados]
    cantidades = [fila[1] for fila in resultados]

    # Crear gráfico con Matplotlib
    plt.figure(figsize=(10, 6))
    plt.bar(insumos, cantidades)
    plt.xlabel('ID de Insumo')
    plt.ylabel('Cantidad de Solicitudes')
    plt.title('Solicitudes por Insumo')

    # Convertir el gráfico a una imagen base64 para mostrar en el HTML
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png')
    buffer.seek(0)
    imagen_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    plt.close()

    # Pasar datos al template
    contexto = {'imagen': imagen_base64}
    return render(request, 'estadisticas.html', contexto)


# Establecer la configuración regional para formatear números
locale.setlocale(locale.LC_ALL, 'es_ES.UTF-8')

def datos_estadisticas(request):
    numeros_fijos_direcciones = {
        'Gabinete': 3000,
        'Otra Dirección': 3,
        # Añade aquí los números fijos para otras direcciones
    }

    numeros_fijos_departamento = {
        'Dirección de Administración y Finanzas': 1000,
        'Otra Dirección': 3,
        # Añade aquí los números fijos para otras direcciones
    }
    
    numeros_fijos = {
        'archivos': 1000,
        'planos_impresos': 0,
        'planos_digitales': 0,
        'plataformas': 0,
        'productos': 0,
        'total': 0,
        'visitas': 0,
    }

    with connection.cursor() as cursor:
        try:
            # Contadores individuales
            cursor.execute("SELECT COALESCE(SUM(fpi.cantidad), 0) FROM formulario_protocolosolicitudinsumo fpi JOIN formulario_protocolosolicitud ps ON fpi.protocolosolicitud_id = ps.id WHERE fpi.insumo_id IN (3, 6, 7, 8) AND ps.estado = 'EJECUTADO'")
            archivos = cursor.fetchone()[0] + numeros_fijos['archivos']

            cursor.execute("SELECT COALESCE(SUM(fpi.cantidad), 0) FROM formulario_protocolosolicitudinsumo fpi JOIN formulario_protocolosolicitud ps ON fpi.protocolosolicitud_id = ps.id WHERE fpi.insumo_id = 1 AND ps.estado = 'EJECUTADO'")
            planos_impresos = cursor.fetchone()[0] + numeros_fijos['planos_impresos']
            
            cursor.execute("SELECT COALESCE(SUM(fpi.cantidad), 0) FROM formulario_protocolosolicitudinsumo fpi JOIN formulario_protocolosolicitud ps ON fpi.protocolosolicitud_id = ps.id WHERE fpi.insumo_id = 2 AND ps.estado = 'EJECUTADO'")
            planos_digitales = cursor.fetchone()[0] + numeros_fijos['planos_digitales']

            cursor.execute("SELECT COALESCE(SUM(fpi.cantidad), 0) FROM formulario_protocolosolicitudinsumo fpi JOIN formulario_protocolosolicitud ps ON fpi.protocolosolicitud_id = ps.id WHERE fpi.insumo_id IN (4, 10, 11, 9) AND ps.estado = 'EJECUTADO'")
            plataformas = cursor.fetchone()[0] + numeros_fijos['plataformas']

            cursor.execute("SELECT COALESCE(SUM(fpi.cantidad), 0) FROM formulario_protocolosolicitudinsumo fpi JOIN formulario_protocolosolicitud ps ON fpi.protocolosolicitud_id = ps.id WHERE fpi.insumo_id IN (12, 13) AND ps.estado = 'EJECUTADO'")
            productos = cursor.fetchone()[0] + numeros_fijos['productos']

            total = archivos + planos_impresos + planos_digitales + plataformas + productos + numeros_fijos['total']

            cursor.execute("SELECT MAX(id) FROM formulario_protocolosolicitud")
            id_mas_alto = cursor.fetchone()[0]


            # Datos para el gráfico de direcciones
            cursor.execute("""
                SELECT direccion, COUNT(*) 
                FROM formulario_protocolosolicitud
                WHERE formulario_protocolosolicitud.estado = 'EJECUTADO'
                GROUP BY direccion
            """)
            resultados_direcciones = cursor.fetchall()

            datos_grafico_direcciones = []
            for direccion, cantidad in resultados_direcciones:
                numero_fijo = numeros_fijos_direcciones.get(direccion, 0)
                datos_grafico_direcciones.append({
                    'label': direccion,
                    'cantidad': cantidad + numero_fijo
                })

            cursor.execute("SELECT COUNT(*) FROM core_visita")
            visitas_departamentosig = cursor.fetchone()[0] + numeros_fijos['visitas']

            # Datos para el gráfico general
            datos_grafico = [
                {'label': 'Plataformas', 'cantidad': plataformas},
                {'label': 'Planos Digitales', 'cantidad': planos_digitales},
                {'label': 'Archivos', 'cantidad': archivos},
                {'label': 'Productos', 'cantidad': productos},
            ]

            # Datos para el gráfico de departamentos
            cursor.execute("""
                SELECT nombre, COUNT(*) AS cantidad
                FROM core_departamento
                GROUP BY nombre
            """)
            resultados_departamentos = cursor.fetchall()

            datos_grafico_departamentos = []
            for nombre, cantidad in resultados_departamentos:
                numero_fijo = numeros_fijos_departamento.get(nombre, 0)
                datos_grafico_departamentos.append({
                    'label': nombre,
                    'cantidad': cantidad + numero_fijo
                })
            
            # Formatear los números
            archivos_formateado = locale.format_string("%d", archivos, grouping=True)
            planos_impresos_formateado = locale.format_string("%d", planos_impresos, grouping=True)
            planos_digitales_formateado = locale.format_string("%d", planos_digitales, grouping=True)
            plataformas_formateado = locale.format_string("%d", plataformas, grouping=True)
            productos_formateado = locale.format_string("%d", productos, grouping=True)
            total_formateado = locale.format_string("%d", total, grouping=True)
            id_mas_alto_formateado = locale.format_string("%d", id_mas_alto, grouping=True)
            visitas_departamentosig_formateado = locale.format_string("%d", visitas_departamentosig, grouping=True)

            return JsonResponse({
                'archivos': archivos_formateado,  # Usar el valor formateado
                'planos_impresos': planos_impresos_formateado,  # Usar el valor formateado
                'planos_digitales': planos_digitales_formateado,  # Usar el valor formateado
                'plataformas': plataformas_formateado,  # Usar el valor formateado
                'productos': productos_formateado,  # Usar el valor formateado
                'id_mas_alto': id_mas_alto_formateado,  # Usar el valor formateado
                'total': total_formateado,  # Usar el valor formateado
                'datos_grafico': datos_grafico,
                'datos_grafico_direcciones': datos_grafico_direcciones,
                'visitas_departamentosig': visitas_departamentosig_formateado, # Usar el valor formateado
                'datos_grafico_departamentos': datos_grafico_departamentos,
            })
        except Exception as e:
            print(f"Error en datos_estadisticas: {e}")
            return JsonResponse({'error': str(e)}, status=500)

def guardar_departamento(request):
    if request.method == "POST":
        departamento_nombre = request.POST.get("departamento")
        
        if departamento_nombre:
            # Crear siempre un nuevo departamento, sin importar si ya existe
            departamento = Departamento.objects.create(nombre=departamento_nombre)
            return JsonResponse({"mensaje": "Departamento guardado correctamente", "departamento": departamento.nombre})
        
        return JsonResponse({"error": "No se recibió un departamento"}, status=400)

    return JsonResponse({"error": "Método no permitido"}, status=405)
