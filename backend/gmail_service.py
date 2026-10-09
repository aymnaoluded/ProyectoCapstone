import os
import base64
from email.message import EmailMessage

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


SCOPES = [
    "https://www.googleapis.com/auth/gmail.send"
]


def obtener_credenciales():
    credenciales = Credentials(
        token=None,
        refresh_token=os.environ["GMAIL_REFRESH_TOKEN"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GMAIL_CLIENT_ID"],
        client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        scopes=SCOPES
    )

    credenciales.refresh(Request())
    return credenciales


def enviar_correo(destinatario, asunto, mensaje):
    credenciales = obtener_credenciales()

    servicio = build(
        "gmail",
        "v1",
        credentials=credenciales
    )

    correo = EmailMessage()
    correo["From"] = os.environ["GMAIL_SENDER"]
    correo["To"] = destinatario
    correo["Subject"] = asunto
    correo.set_content(mensaje)

    mensaje_codificado = base64.urlsafe_b64encode(
        correo.as_bytes()
    ).decode("utf-8")

    respuesta = servicio.users().messages().send(
        userId="me",
        body={"raw": mensaje_codificado}
    ).execute()

    return respuesta