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


def calcular_confianza_semantica(similitudes: list[float]) -> float:
    """
    Calcula el nivel de confianza semántica global a partir de la distribución
    de similitudes coseno de los fragmentos recuperados en RAG.

    La confianza NO mide la calidad de la respuesta generada por la IA.
    Mide exclusivamente el grado de correspondencia semántica entre la
    pregunta del usuario y el conjunto de fragmentos recuperados.

    Fórmula:
        C = score_ponderado × exp(−k × dispersión_relativa)

    Componentes:
        1. score_ponderado:
           Promedio ponderado de las similitudes con pesos posicionales fijos
           [0.55, 0.25, 0.13, 0.07], normalizados a suma 1.
           El fragmento más relevante (s₁) recibe siempre el mayor peso,
           reflejando que pgvector lo devuelve primero por distancia mínima.

        2. dispersión_relativa = σ(scores) / s₁
           Desviación estándar poblacional de los 4 scores, normalizada por
           el mejor score. Captura cuán "desigual" es el conjunto de fragmentos:
           - Dispersión ≈ 0: todos los fragmentos tienen similitud similar.
           - Dispersión alta: solo uno o pocos fragmentos son relevantes.

        3. penalización = exp(−k × dispersión_relativa)  con k = 2.0
           Factor de penalización exponencial. Cuando los fragmentos secundarios
           tienen similitudes muy inferiores al principal, la penalización reduce
           la confianza, evitando que un único fragmento relevante genere un
           nivel alto artificialmente.
           - Dispersión 0.00 → penalización ≈ 1.00 (sin castigo)
           - Dispersión 0.07 → penalización ≈ 0.87 (castigo mínimo)
           - Dispersión 0.18 → penalización ≈ 0.70 (castigo moderado)
           - Dispersión 0.27 → penalización ≈ 0.58 (castigo significativo)

    Umbrales de clasificación (en chat.py):
        ALTA  : C ≥ 0.72  (fragmentos semánticamente coherentes con la pregunta)
        MEDIA : C ≥ 0.50  (coincidencia parcial, puede escalar)
        BAJA  : C < 0.50  (poca o muy desigual correspondencia semántica)

    Escenarios de referencia:
        [0.90, 0.87, 0.84, 0.81] → C ≈ 0.815  ALTA   (alta coherencia general)
        [0.85, 0.40, 0.35, 0.25] → C ≈ 0.367  BAJA   (coincidencia aislada)
        [0.42, 0.38, 0.30, 0.22] → C ≈ 0.264  BAJA   (similitud baja general)
    """
    import math

    if not similitudes:
        return 0.0

    scores = sorted([max(0.0, min(1.0, float(s))) for s in similitudes], reverse=True)
    s1 = scores[0]
    if s1 <= 0.0:
        return 0.0

    n = len(scores)
    if n == 1:
        return round(s1, 3)

    # --- 1. Score ponderado con pesos posicionales fijos ---
    pesos_ref = [0.55, 0.25, 0.13, 0.07][:n]
    total_p = sum(pesos_ref)
    pesos = [p / total_p for p in pesos_ref]
    score_ponderado = sum(w * s for w, s in zip(pesos, scores))

    # --- 2. Dispersión relativa (stddev normalizada por s1) ---
    media = sum(scores) / n
    varianza = sum((s - media) ** 2 for s in scores) / n
    stddev = math.sqrt(varianza)
    dispersion_relativa = stddev / s1

    # --- 3. Penalización exponencial por dispersión ---
    K_DISPERSION = 2.0
    penalizacion = math.exp(-K_DISPERSION * dispersion_relativa)

    confianza = score_ponderado * penalizacion
    return round(min(confianza, 1.0), 3)


