"""
OpenAI embedding model configuration for the RAG pipeline.
"""
from functools import lru_cache

from langchain_openai import OpenAIEmbeddings

from app.config import get_settings


@lru_cache
def get_embeddings() -> OpenAIEmbeddings:
    """
    Return a cached OpenAI embeddings instance.
    Uses text-embedding-3-small by default (fast + cost-effective).
    Switch to text-embedding-3-large for higher accuracy.
    """
    settings = get_settings()
    return OpenAIEmbeddings(
        model=settings.openai_embedding_model,
        openai_api_key=settings.openai_api_key,
    )
