import os
import io
import math
import time
import logging
from google import genai
from google.genai import types
from google.genai.errors import APIError
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import docx

logger = logging.getLogger(__name__)

_api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
gemini_client = genai.Client(api_key=_api_key)

# Cadena de modelos: intenta primero el principal y conmuta automáticamente si hay saturación (503/429)
MODELO_GENERACION = "gemini-3.6-flash"
MODELOS_RESPALDO = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]

MODELO_EMBEDDING = "gemini-embedding-001"
DIMENSIONES_EMBEDDING = 1024

MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
TAMANO_LOTE_EMBEDDINGS = 50


class IANoDisponibleError(Exception):
    pass


def _normalizar_formato(tipo: str) -> str:
    valor = (tipo or "").split(";")[0].strip().lower().lstrip(".")

    if valor in ("application/pdf", "pdf"):
        return "pdf"
    if valor in (MIME_DOCX, "docx"):
        return "docx"
    if valor.startswith("text/") or valor == "txt":
        return "txt"
    return ""


def extraer_texto(buffer: bytes, content_type: str) -> str:
    formato = _normalizar_formato(content_type)

    if formato == "pdf":
        reader = PdfReader(io.BytesIO(buffer))
        return "\n".join(
            page.extract_text() or ""
            for page in reader.pages
        )

    if formato == "docx":
        doc = docx.Document(io.BytesIO(buffer))
        partes = [p.text for p in doc.paragraphs if p.text.strip()]
        # Extraer también texto de tablas (reglamentos, tarifas, contactos)
        for tabla in doc.tables:
            for fila in tabla.rows:
                celdas = [celda.text.strip() for celda in fila.cells if celda.text.strip()]
                if celdas:
                    partes.append(" | ".join(celdas))
        return "\n".join(partes)

    if formato == "txt":
        return buffer.decode("utf-8", errors="ignore")

    raise ValueError("Formato no soportado. Solo PDF, DOCX o TXT")


def fragmentar_texto(texto: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )
    fragmentos = splitter.split_text(texto)
    return [f.strip() for f in fragmentos if f and f.strip()]


def generar_embedding(texto: str, task_type: str) -> list[float]:
    ultimo_error = None
    for intento in range(2):
        try:
            resultado = gemini_client.models.embed_content(
                model=MODELO_EMBEDDING,
                contents=texto,
                config=types.EmbedContentConfig(
                    output_dimensionality=DIMENSIONES_EMBEDDING,
                    task_type=task_type
                )
            )
            return resultado.embeddings[0].values
        except APIError as e:
            ultimo_error = e
            if e.code in (503, 429) and intento == 0:
                time.sleep(1.0)
                continue
            raise IANoDisponibleError(f"Gemini no pudo generar el embedding: {e}") from e
        except Exception as e:
            raise IANoDisponibleError(f"Gemini no pudo generar el embedding: {e}") from e

    raise IANoDisponibleError(f"Gemini no pudo generar el embedding: {ultimo_error}") from ultimo_error


def generar_embedding_documento(texto: str) -> list[float]:
    return generar_embedding(texto, task_type="RETRIEVAL_DOCUMENT")


def generar_embedding_consulta(pregunta: str) -> list[float]:
    return generar_embedding(pregunta, task_type="RETRIEVAL_QUERY")


def generar_embeddings_documentos(textos: list[str]) -> list[list[float]]:
    vectores: list[list[float]] = []

    for i in range(0, len(textos), TAMANO_LOTE_EMBEDDINGS):
        lote = textos[i:i + TAMANO_LOTE_EMBEDDINGS]

        try:
            resultado = gemini_client.models.embed_content(
                model=MODELO_EMBEDDING,
                contents=lote,
                config=types.EmbedContentConfig(
                    output_dimensionality=DIMENSIONES_EMBEDDING,
                    task_type="RETRIEVAL_DOCUMENT"
                )
            )
        except Exception as e:
            raise IANoDisponibleError(f"Gemini no pudo generar los embeddings: {e}") from e

        if len(resultado.embeddings) != len(lote):
            raise IANoDisponibleError(
                "Gemini devolvió una cantidad de embeddings distinta a la esperada"
            )

        vectores.extend(e.values for e in resultado.embeddings)

    return vectores


def responder_gemini(pregunta: str, contextos: list[str]) -> str:
    contexto_unificado = "\n\n---\n\n".join(contextos)

    system_instruction = (
        "Eres Luz, la asistente virtual de Comunidad Clara Administraciones. "
        "Si te preguntan tu nombre, responde que te llamas Luz.\n"
        "Responde a las preguntas utilizando ÚNICAMENTE "
        "la siguiente información de contexto.\n"
        "Si la respuesta no se encuentra en el contexto, "
        "di claramente: "
        "'No dispongo de información suficiente en los "
        "documentos para responder a esta consulta.'\n\n"
        f"Contexto disponible:\n{contexto_unificado}"
    )

    modelos_a_probar = [MODELO_GENERACION, *MODELOS_RESPALDO]
    ultimo_error = None

    for modelo in modelos_a_probar:
        for intento in range(2):
            try:
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                )
                # Solo aplicar temperature en modelos que no la tienen deprecada
                if not modelo.startswith("gemini-3."):
                    config.temperature = 0.2

                response = gemini_client.models.generate_content(
                    model=modelo,
                    contents=pregunta,
                    config=config,
                )

                if not response.text:
                    raise IANoDisponibleError(f"El modelo {modelo} devolvió una respuesta vacía")

                if modelo != MODELO_GENERACION:
                    logger.info("Respuesta generada usando modelo de respaldo: %s", modelo)

                return response.text

            except APIError as e:
                ultimo_error = e
                if e.code in (503, 429):
                    logger.warning(
                        "Modelo %s saturado (HTTP %s, intento %d/2). %s",
                        modelo,
                        e.code,
                        intento + 1,
                        "Reintentando..." if intento == 0 else "Cambiando a modelo de respaldo...",
                    )
                    if intento == 0:
                        time.sleep(1.0)
                        continue
                    break  # Pasa al siguiente modelo en MODELOS_RESPALDO
                raise IANoDisponibleError(f"Gemini no respondió ({modelo}): {e}") from e

            except IANoDisponibleError:
                raise
            except Exception as e:
                raise IANoDisponibleError(f"Gemini no respondió ({modelo}): {e}") from e

    raise IANoDisponibleError(
        f"Todos los modelos de Gemini están saturados temporalmente: {ultimo_error}"
    ) from ultimo_error


def calcular_confianza_semantica(similitudes: list[float]) -> float:
    if not similitudes:
        return 0.0

    scores = sorted([max(0.0, min(1.0, float(s))) for s in similitudes], reverse=True)
    s1 = scores[0]
    if s1 <= 0.0:
        return 0.0

    n = len(scores)
    if n == 1:
        return round(s1, 3)

    pesos_ref = [0.55, 0.25, 0.13, 0.07][:n]
    total_p = sum(pesos_ref)
    pesos = [p / total_p for p in pesos_ref]
    score_ponderado = sum(w * s for w, s in zip(pesos, scores))

    media = sum(scores) / n
    varianza = sum((s - media) ** 2 for s in scores) / n
    stddev = math.sqrt(varianza)
    dispersion_relativa = stddev / s1

    K_DISPERSION = 2.0
    penalizacion = math.exp(-K_DISPERSION * dispersion_relativa)

    confianza = score_ponderado * penalizacion
    return round(min(confianza, 1.0), 3)