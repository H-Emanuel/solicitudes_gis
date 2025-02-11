from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import control_creacion_usuario.routing

application = ProtocolTypeRouter({
    "http": django_asgi_app,  # Maneja peticiones HTTP normales
    "websocket": AuthMiddlewareStack(
        URLRouter(
            control_creacion_usuario.routing.websocket_urlpatterns
        )
    ),
})
