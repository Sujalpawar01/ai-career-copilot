"""
ChromaDB vector store client.
Handles document ingestion and similarity search for the RAG pipeline.
"""
import logging
import uuid
from typing import Any

import chromadb
from langchain.schema import Document
from langchain_chroma import Chroma

from app.config import get_settings
from app.rag.embeddings import get_embeddings

logger = logging.getLogger(__name__)
settings = get_settings()

# Collection naming convention
RESUME_COLLECTION_PREFIX = "resume_"
JD_COLLECTION_PREFIX = "jd_"


def _get_chroma_client() -> chromadb.ClientAPI:
    """
    Return a ChromaDB client.
    Uses HTTP client when CHROMA_HOST is set (Docker/production),
    otherwise uses a local persistent client (development).
    """
    if settings.chroma_host and settings.chroma_host != "localhost":
        return chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
    else:
        return chromadb.PersistentClient(path=settings.chroma_persist_dir)


def get_vector_store(collection_name: str) -> Chroma:
    """
    Return a LangChain Chroma vector store for a given collection.

    Args:
        collection_name: Name of the ChromaDB collection

    Returns:
        LangChain Chroma instance connected to the collection
    """
    client = _get_chroma_client()
    return Chroma(
        client=client,
        collection_name=collection_name,
        embedding_function=get_embeddings(),
    )


async def add_documents_to_store(
    documents: list[Document],
    collection_name: str,
    doc_id: str | None = None,
) -> str:
    """
    Add chunked documents to a ChromaDB collection.

    Args:
        documents: List of chunked LangChain Documents
        collection_name: Target ChromaDB collection name
        doc_id: Optional document ID for metadata tagging

    Returns:
        The collection_name used (for storing in PostgreSQL)
    """
    if not documents:
        logger.warning(f"No documents to add to collection '{collection_name}'")
        return collection_name

    # Assign unique IDs to each chunk
    ids = [str(uuid.uuid4()) for _ in documents]

    vector_store = get_vector_store(collection_name)
    vector_store.add_documents(documents=documents, ids=ids)

    logger.info(
        f"Added {len(documents)} chunks to collection '{collection_name}'"
        + (f" (doc_id={doc_id})" if doc_id else "")
    )
    return collection_name


async def query_similar_chunks(
    query: str,
    collection_name: str,
    top_k: int = 5,
    filter_dict: dict[str, Any] | None = None,
) -> list[Document]:
    """
    Retrieve the top-k most similar document chunks for a query.

    Args:
        query: The search query string
        collection_name: ChromaDB collection to search in
        top_k: Number of top chunks to retrieve
        filter_dict: Optional metadata filters for ChromaDB

    Returns:
        List of matching Document chunks with metadata
    """
    vector_store = get_vector_store(collection_name)

    try:
        results = vector_store.similarity_search(
            query=query,
            k=top_k,
            filter=filter_dict,
        )
        logger.debug(f"Retrieved {len(results)} chunks for query from '{collection_name}'")
        return results
    except Exception as e:
        logger.error(f"Vector search failed in '{collection_name}': {e}", exc_info=True)
        return []


async def delete_collection(collection_name: str) -> None:
    """Delete an entire ChromaDB collection (e.g., when a resume is deleted)."""
    try:
        client = _get_chroma_client()
        client.delete_collection(collection_name)
        logger.info(f"Deleted ChromaDB collection: '{collection_name}'")
    except Exception as e:
        logger.warning(f"Could not delete collection '{collection_name}': {e}")


def get_resume_collection_name(resume_id: str) -> str:
    """Standardized collection name for a resume."""
    return f"{RESUME_COLLECTION_PREFIX}{resume_id}"


def get_jd_collection_name(jd_id: str) -> str:
    """Standardized collection name for a job description."""
    return f"{JD_COLLECTION_PREFIX}{jd_id}"
