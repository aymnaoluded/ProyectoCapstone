import os 
import io
import cohere
from google import genai
from google.genai import types
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import docx

cohere_client = cohere.ClientV2(api_key=os.getenv("COHERE_API_KEY"))
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def extraer_texto(buffer: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(buffer))
        return "\n".join([page.extract_text() or "" for page in reader.pages])

    if content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        doc = docx.Document(io.BytesIO(buffer))
        return "\n".join([p.text for p in doc.paragraphs])

    if content_type.startswith("text/"):
        return buffer.decode("utf-8", errors="ignore")

    raise ValueError("Formato no soportado. Solo PDF, DOCX o TXT")

def fragmentar_texto(texto:str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
    return splitter.split_text(texto)

def generar_embedding_documento(texto:str) -> list[float]:
    res = cohere_client.embed(
        texts=[texto],
        model="embed-multilingual-v3.0",
        input_type="search_document",
        embedding_types=["float"]
    )
    return res.embeddings.float[0]

def generar_embedding_consulta(pregunta: str) -> list[float]:
    res = cohere_client.embed(
        texts=[pregunta],
        model="embed-multilingual-v3.0",
        input_type="search_query",
        embedding_types=["float"]
    )
    return res.embeddings.float[0]

def responder_gemini(pregunta: str, contextos: list[str]) -> str:
    contexto_unificado = "\n\n---\n\n".join(contextos)

    system_instruction = (
        "Eres el asistente virtual de soporte de SupportAI.\n"
        "Responde a las preguntas utilizando ÚNICAMENTE la siguiente información de contexto.\n"
        "Si la respuesta no se encuentra en el contexto, di claramente: "
        "'No dispongo de información suficiente en los documentos para responder a esta consulta.'\n\n"
        f"Contexto disponible:\n{contexto_unificado}"
    )

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=pregunta,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.2
        )
    )
    return response.text or "Sin respuesta generada"