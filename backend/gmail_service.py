import base64
import logging
import os
import re
import time
from email.message import EmailMessage
from typing import Optional, Dict, Any, List

from dotenv import load_dotenv
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

load_dotenv()
logger = logging.getLogger(__name__)

# Scopes requeridos: envío y consulta de correo
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly"
]

# Cache en memoria para reutilizar el token de acceso sin refrescarlo en cada petición
_credenciales_cache: Optional[Credentials] = None


class GmailError(Exception):
    """Excepción base para errores del servicio Gmail."""
    pass


class GmailConfiguracionError(GmailError):
    """Error cuando faltan variables de entorno necesarias."""
    pass


class GmailAutenticacionError(GmailError):
    """Error al autenticar o refrescar tokens OAuth 2.0."""
    pass


class GmailEnvioError(GmailError):
    """Error al despachar el correo mediante la API."""
    pass


def _enmascarar(valor: Optional[str], inicio: int = 4, fin: int = 4) -> str:
    """Enmascara cadenas sensibles para registros de diagnóstico seguros."""
    if not valor:
        return "[NO CONFIGURADO]"
    val = valor.strip()
    if len(val) <= (inicio + fin):
        return "***"
    return f"{val[:inicio]}...{val[-fin:]}"


def obtener_estado_configuracion() -> Dict[str, Any]:
    """
    Retorna el estado de configuración de Gmail sin exponer credenciales sensibles.
    """
    client_id = os.getenv("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()
    sender = os.getenv("GMAIL_SENDER", "").strip()
    simulacion_forzada = os.getenv("GMAIL_SIMULACION", "false").lower() in ("true", "1", "yes")

    esta_completo = bool(client_id and client_secret and refresh_token and sender)
    modo_simulacion = simulacion_forzada or (not esta_completo)

    return {
        "configurado": esta_completo,
        "modo_simulacion": modo_simulacion,
        "remitente": sender or "[NO CONFIGURADO]",
        "client_id_enmascarado": _enmascarar(client_id, 6, 6) if client_id else "[NO CONFIGURADO]",
        "client_secret_presente": bool(client_secret),
        "refresh_token_presente": bool(refresh_token),
        "sender_presente": bool(sender)
    }


def obtener_credenciales(forzar_refresco: bool = False) -> Credentials:
    """
    Obtiene credenciales OAuth 2.0 válidas.
    Reutiliza el token si sigue vigente y refresca de forma automática si expiró.
    """
    global _credenciales_cache

    client_id = os.getenv("GMAIL_CLIENT_ID", "").strip()
    client_secret = os.getenv("GMAIL_CLIENT_SECRET", "").strip()
    refresh_token = os.getenv("GMAIL_REFRESH_TOKEN", "").strip()

    faltantes = []
    if not client_id:
        faltantes.append("GMAIL_CLIENT_ID")
    if not client_secret:
        faltantes.append("GMAIL_CLIENT_SECRET")
    if not refresh_token:
        faltantes.append("GMAIL_REFRESH_TOKEN")

    if faltantes:
        raise GmailConfiguracionError(
            f"Faltan las siguientes variables de entorno para Gmail: {', '.join(faltantes)}"
        )

    # Si ya tenemos credenciales en caché y son válidas, reutilizarlas
    if _credenciales_cache and not forzar_refresco:
        if _credenciales_cache.valid and not _credenciales_cache.expired:
            return _credenciales_cache

    try:
        credenciales = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )

        # Refrescar para obtener un access_token fresco
        request_obj = Request()
        credenciales.refresh(request_obj)

        if not credenciales.valid:
            raise GmailAutenticacionError("Las credenciales de Gmail no son válidas tras el refresco.")

        _credenciales_cache = credenciales
        logger.info("Credenciales de Gmail OAuth 2.0 refrescadas exitosamente.")
        return credenciales

    except RefreshError as e:
        logger.error(
            "Error al renovar token de Gmail (RefreshError). Verifica client_id, client_secret y refresh_token: %s",
            e
        )
        raise GmailAutenticacionError(
            "El token de actualización (Refresh Token) de Gmail es inválido o ha expirado."
        ) from e
    except Exception as e:
        logger.error("Error inesperado al inicializar credenciales de Gmail: %s", e)
        raise GmailAutenticacionError(f"Fallo de autenticación con Gmail API: {str(e)}") from e


def probar_conexion_gmail() -> Dict[str, Any]:
    """
    Prueba la conexión y autenticación con la API de Gmail.
    """
    estado = obtener_estado_configuracion()
    if estado["modo_simulacion"] and not estado["configurado"]:
        return {
            "exito": False,
            "simulado": True,
            "mensaje": "Gmail en modo simulación (faltan variables de entorno en backend/.env).",
            "detalles": estado
        }

    try:
        credenciales = obtener_credenciales(forzar_refresco=True)
        servicio = build("gmail", "v1", credentials=credenciales, cache_discovery=False)
        perfil = servicio.users().getProfile(userId="me").execute()
        
        return {
            "exito": True,
            "simulado": False,
            "email_autenticado": perfil.get("emailAddress"),
            "total_mensajes": perfil.get("messagesTotal"),
            "mensaje": f"Conexión exitosa con cuenta {perfil.get('emailAddress')}",
            "detalles": estado
        }
    except Exception as e:
        logger.warning("Fallo en prueba de conexión con Gmail: %s", e)
        return {
            "exito": False,
            "simulado": False,
            "error": str(e),
            "mensaje": "No se pudo conectar con la API de Gmail. Revisa las credenciales OAuth 2.0.",
            "detalles": estado
        }


def enviar_correo(
    destinatario: str,
    asunto: str,
    mensaje: str,
    mensaje_html: Optional[str] = None
) -> Dict[str, Any]:
    """
    Envía un correo electrónico a través de la API de Gmail (OAuth 2.0).
    Si las credenciales no están configuradas en entorno de desarrollo,
    opera en modo seguro simulado para no interrumpir el flujo del sistema.
    """
    if not destinatario or not destinatario.strip():
        raise GmailEnvioError("El destinatario del correo no puede estar vacío.")

    destinatario = destinatario.strip()
    asunto = (asunto or "Notificación SupportAI").strip()

    estado = obtener_estado_configuracion()

    # MODO SIMULACIÓN PARA DESARROLLO SIN CREDENCIALES
    if estado["modo_simulacion"] and not estado["configurado"]:
        logger.warning(
            "[GMAIL DEV - SIMULACIÓN] Correo a '%s' | Asunto: '%s'\nContenido:\n%s\n"
            "--> Configure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN y GMAIL_SENDER en .env para envíos reales.",
            destinatario,
            asunto,
            mensaje[:200]
        )
        return {
            "id": f"simulado-{int(time.time() * 1000)}",
            "threadId": f"thread-{int(time.time() * 1000)}",
            "destinatario": destinatario,
            "asunto": asunto,
            "estado": "simulado",
            "mensaje": "Correo simulado (modo desarrollo sin credenciales configuradas)"
        }

    sender = os.getenv("GMAIL_SENDER", "").strip()
    if not sender:
        raise GmailConfiguracionError("Falta definir la variable GMAIL_SENDER en .env")

    try:
        credenciales = obtener_credenciales()
        servicio = build("gmail", "v1", credentials=credenciales, cache_discovery=False)

        correo = EmailMessage()
        correo["From"] = sender
        correo["To"] = destinatario
        correo["Subject"] = asunto

        # Contenido plano
        correo.set_content(mensaje)

        # Si se envía HTML, agregarlo como contenido alternativo
        if mensaje_html:
            correo.add_alternative(mensaje_html, subtype="html")

        mensaje_codificado = base64.urlsafe_b64encode(correo.as_bytes()).decode("utf-8")

        respuesta = servicio.users().messages().send(
            userId="me",
            body={"raw": mensaje_codificado}
        ).execute()

        logger.info(
            "Correo enviado exitosamente a '%s' (ID Gmail: %s)",
            destinatario,
            respuesta.get("id")
        )

        return {
            "id": respuesta.get("id"),
            "threadId": respuesta.get("threadId"),
            "destinatario": destinatario,
            "asunto": asunto,
            "estado": "enviado"
        }

    except RefreshError as e:
        logger.error("Token de Gmail expirado o revocado: %s", e)
        raise GmailAutenticacionError("El token de Gmail expiró o fue revocado.") from e
    except HttpError as e:
        logger.error("Error HTTP devuelto por la API de Gmail: %s", e)
        raise GmailEnvioError(f"Error de la API de Gmail ({e.status_code}): {e.reason}") from e
    except Exception as e:
        logger.error("Fallo al enviar correo a %s: %s", destinatario, e)
        raise GmailEnvioError(f"No se pudo enviar el correo: {str(e)}") from e


def listar_correos_recientes(max_resultados: int = 5, query: str = "") -> List[Dict[str, Any]]:
    """
    Obtiene los correos más recientes recibidos (si el scope lo autoriza).
    Útil para recepción o auditoría de tickets por correo.
    """
    estado = obtener_estado_configuracion()
    if estado["modo_simulacion"] and not estado["configurado"]:
        return []

    try:
        credenciales = obtener_credenciales()
        servicio = build("gmail", "v1", credentials=credenciales, cache_discovery=False)

        resultados = servicio.users().messages().list(
            userId="me",
            maxResults=max_resultados,
            q=query or "label:INBOX"
        ).execute()

        mensajes = resultados.get("messages", [])
        lista = []

        for m in mensajes:
            detalle = servicio.users().messages().get(
                userId="me",
                id=m["id"],
                format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()

            headers = {h["name"]: h["value"] for h in detalle.get("payload", {}).get("headers", [])}
            lista.append({
                "id": m["id"],
                "threadId": m["threadId"],
                "snippet": detalle.get("snippet", ""),
                "from": headers.get("From", ""),
                "subject": headers.get("Subject", ""),
                "date": headers.get("Date", "")
            })

        return lista

    except Exception as e:
        logger.warning("No se pudieron listar correos recibidos: %s", e)
        return []