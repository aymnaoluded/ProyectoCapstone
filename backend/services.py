import os
import io
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import docx

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODELO_GENERACION = "gemini-3.6-flash"
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

        return "\n".join(
            p.text
            for p in doc.paragraphs
        )

    if formato == "txt":
        return buffer.decode(
            "utf-8",
            errors="ignore"
        )

    raise ValueError(
        "Formato no soportado. Solo PDF, DOCX o TXT"
    )


def fragmentar_texto(texto: str) -> list[str]:

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150
    )

    return splitter.split_text(texto)


def generar_embedding(texto: str, task_type: str) -> list[float]:
    try:
        resultado = gemini_client.models.embed_content(
            model=MODELO_EMBEDDING,
            contents=texto,
            config=types.EmbedContentConfig(
                output_dimensionality=DIMENSIONES_EMBEDDING,
                task_type=task_type
            )
        )
    except Exception as e:
        raise IANoDisponibleError(f"Gemini no pudo generar el embedding: {e}") from e

    return resultado.embeddings[0].values


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
        "Eres el asistente virtual de soporte de SupportAI.\n"
        "Responde a las preguntas utilizando ÚNICAMENTE "
        "la siguiente información de contexto.\n"
        "Si la respuesta no se encuentra en el contexto, "
        "di claramente: "
        "'No dispongo de información suficiente en los "
        "documentos para responder a esta consulta.'\n\n"
        f"Contexto disponible:\n{contexto_unificado}"
    )

    try:
        response = gemini_client.models.generate_content(
            model=MODELO_GENERACION,
            contents=pregunta,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2
            )
        )
    except Exception as e:
        raise IANoDisponibleError(f"Gemini no respondió: {e}") from e

    if not response.text:
        raise IANoDisponibleError("Gemini devolvió una respuesta vacía")

    return response.text

