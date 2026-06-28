"""
Embedding model configuration — supports Gemini (primary) or OpenAI (fallback).
"""
from functools import lru_cache

from app.config import get_settings


@lru_cache
def get_embeddings():
    """
    Return a cached embeddings instance.
    Uses Google Gemini embeddings if GOOGLE_API_KEY is set,
    otherwise falls back to OpenAI embeddings.
    """
    settings = get_settings()

    if settings.google_api_key:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        return GoogleGenerativeAIEmbeddings(
            model=settings.gemini_embedding_model,
            google_api_key=settings.google_api_key,
        )

    # Fallback: OpenAI
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        openai_api_key=settings.openai_api_key,
    )
